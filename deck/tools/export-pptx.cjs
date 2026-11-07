#!/usr/bin/env node
/*
 * export-pptx.cjs: a .pptx with one full-bleed 1920x1080 picture per physical slide (final state).
 *
 *   node tools/export-pptx.cjs <deck.html> <out.pptx>
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

function pngSize(buf) {
  // PNG IHDR: width and height are big-endian uint32 at byte offsets 16 and 20.
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function exportPptx(deckFile, outFile) {
  let PptxGenJS;
  try {
    PptxGenJS = require('pptxgenjs');
  } catch {
    throw new Error('pptxgenjs is missing: run `npm install` in the deck/ folder first');
  }
  const { browser, page, info, errors } = await openPrint(deckFile, { zoom1: true });
  const shots = [];
  try {
    for (const s of info.slides) {
      const loc = page.locator('#stage .slide[id="' + s.id.replace(/"/g, '\\"') + '"]');
      const buf = await loc.screenshot({ type: 'png', animations: 'disabled', scale: 'css' });
      const size = pngSize(buf);
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
      data: 'image/png;base64,' + shots[i].toString('base64'),
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
  return { slides: info.slides.length, hidden: info.slides.filter((s) => s.hidden).length, errors };
}

async function main() {
  const [inFile, outFile] = process.argv.slice(2);
  if (!inFile || !outFile) {
    console.error('usage: node tools/export-pptx.cjs <deck.html> <out.pptx>');
    process.exit(2);
  }
  const r = await exportPptx(inFile, outFile);
  r.errors.forEach((e) => console.warn('export-pptx: page error: ' + e));
  console.log('export-pptx: wrote ' + outFile + ' (' + r.slides + ' slides, ' + r.hidden + ' hidden, notes empty)');
}

if (require.main === module) main().catch((e) => { console.error(e.message || e); process.exit(1); });
module.exports = { exportPptx, pngSize };
