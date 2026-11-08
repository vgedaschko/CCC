#!/usr/bin/env node
/*
 * export-pptx.cjs: a .pptx with one full-bleed 1920x1080 picture per physical slide (final state).
 *
 *   node tools/export-pptx.cjs <deck.html> <out.pptx> [--paper] [--jpeg [quality]]
 *     --paper            light paper palette
 *     --jpeg [quality]   JPEG pictures (default quality 94) instead of lossless PNG: a deck with soft light pools
 *                        is ~1 MB per slide as PNG; JPEG q94 keeps text edges clean at a quarter of the size
 *
 * - every slide gets a real title placeholder (read by screen readers and the accessibility checker),
 *   placed behind the picture so it does not show
 * - the picture carries alt text (the slide's text)
 * - hidden slides stay hidden (show="0"), and are tagged "Variant · chosen live" in the picture
 * - speaker notes are EMPTY (course rule: a presentation without notes)
 * Needs pptxgenjs (devDependency in deck/package.json: run `npm install` in deck/ once).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { openPrint } = require('./print-page.cjs');

function jpegSize(buf) {
  // JPEG: walk the markers to the first SOFn frame header (height, width as big-endian uint16).
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xFF) return null;
    const m = buf[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function pngSize(buf) {
  // PNG IHDR: width and height are big-endian uint32 at byte offsets 16 and 20.
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function exportPptx(deckFile, outFile, opts) {
  const o = opts || {};
  let PptxGenJS;
  try {
    PptxGenJS = require('pptxgenjs');
  } catch {
    throw new Error('pptxgenjs is missing: run `npm install` in the deck/ folder first');
  }
  const { browser, page, info, errors } = await openPrint(deckFile, { zoom1: true, paper: !!o.paper });
  const shots = [];
  try {
    for (const s of info.slides) {
      const loc = page.locator('#stage .slide[id="' + s.id.replace(/"/g, '\\"') + '"]');
      const buf = o.jpeg
        ? await loc.screenshot({ type: 'jpeg', quality: o.jpeg, animations: 'disabled', scale: 'css' })
        : await loc.screenshot({ type: 'png', animations: 'disabled', scale: 'css' });
      const size = o.jpeg ? jpegSize(buf) : pngSize(buf);
      if (!size || size.width !== 1920 || size.height !== 1080) {
        throw new Error('slide ' + s.id + ' rendered at ' + JSON.stringify(size) + ', expected 1920x1080');
      }
      shots.push(buf);
    }
  } finally {
    await browser.close();
  }

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in, 16:9
  pptx.title = info.title;
  pptx.subject = info.title;
  pptx.author = info.author || '';
  pptx.company = '';
  pptx.defineSlideMaster({
    title: 'DECK_PICTURE',
    background: { color: '000000' },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.4, y: 0.25, w: 12.5, h: 0.9, fontSize: 28, color: 'FFFFFF' }, text: '' } },
    ],
  });

  info.slides.forEach((s, i) => {
    const slide = pptx.addSlide({ masterName: 'DECK_PICTURE' });
    slide.addText(s.title, { placeholder: 'title' });
    slide.addImage({
      data: (o.jpeg ? 'image/jpeg' : 'image/png') + ';base64,' + shots[i].toString('base64'),
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      altText: (s.title + '. ' + s.text).slice(0, 1000),
    });
    if (s.hidden) slide.hidden = true;
  });

  fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  await pptx.writeFile({ fileName: outFile, compression: true });
  return { slides: info.slides.length, hidden: info.slides.filter((s) => s.hidden).length, errors, bytes: fs.statSync(outFile).size };
}

async function main() {
  const args = process.argv.slice(2);
  const paper = args.includes('--paper');
  const ji = args.indexOf('--jpeg');
  const jpeg = ji < 0 ? 0 : (/^\d+$/.test(args[ji + 1] || '') ? Math.max(50, Math.min(100, +args[ji + 1])) : 94);
  const [inFile, outFile] = args.filter((a, i) => !a.startsWith('--') && !(ji >= 0 && i === ji + 1 && /^\d+$/.test(a)));
  if (!inFile || !outFile) {
    console.error('usage: node tools/export-pptx.cjs <deck.html> <out.pptx> [--paper]');
    process.exit(2);
  }
  const r = await exportPptx(inFile, outFile, { paper, jpeg });
  r.errors.forEach((e) => console.warn('export-pptx: page error: ' + e));
  console.log('export-pptx: wrote ' + outFile + ' (' + r.slides + ' slides, ' + r.hidden + ' hidden, notes empty, ' +
    (jpeg ? 'JPEG q' + jpeg : 'PNG') + ', ' + (r.bytes / 1048576).toFixed(1) + ' MB)');
}

if (require.main === module) main().catch((e) => { console.error(e.message || e); process.exit(1); });
module.exports = { exportPptx, pngSize, jpegSize };
