#!/usr/bin/env node
/*
 * export-pdf.cjs: the static PDF of a deck: one 16:9 page per exported slide, every slide in its final build state.
 *
 *   node tools/export-pdf.cjs <deck.html> <out.pdf> [--paper] [--no-shrink]
 *
 * --paper prints the light paper variant (?print&paper: the design maps its palette onto paper via the
 * root class deck-paper). The dark variant stays the default.
 * Uses the engine's print mode (?print): all builds shown, triggered elements and live bindings in their
 * data-print defaults. Which slides and in which order is the engine's static export plan 'pdf'
 * (README "Static exports"): the main flow in clicker order, then the hidden variants and backups as an
 * appendix (tagged); auto bridges, unused member slots and data-export="pptx" slides are left out.
 * Chromium prints text as vector text.
 *
 * Size pass (optional, lossless): if Python's pikepdf is installed (pip install --user pikepdf), the PDF goes
 * through tools/lib/pdf-shrink.py (identical streams merged, flate level 9, object streams). Without pikepdf,
 * or with --no-shrink, the PDF stays as Chromium wrote it.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const { openPrint } = require('./print-page.cjs');

const SHRINK = path.join(__dirname, 'lib', 'pdf-shrink.py');

/** The PDF as latin1 text, with its compressed object streams (/ObjStm, as after the size pass) inflated and appended. */
function pdfText(buf) {
  const s = buf.toString('latin1');
  let text = s;
  const re = /\/Type\s*\/ObjStm\b/g;
  let m;
  while ((m = re.exec(s))) {
    const open = s.lastIndexOf('obj', m.index);
    const kw = s.indexOf('stream', m.index);
    if (open < 0 || kw < 0) continue;
    const len = (s.slice(open, kw).match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/) || [])[1];
    if (!len) continue;
    const start = kw + 6 + (s[kw + 6] === '\r' ? 2 : 1);
    try { text += '\n' + zlib.inflateSync(buf.subarray(start, start + Number(len))).toString('latin1'); } catch { /* not flate */ }
  }
  return text;
}

/**
 * How much of its page each page's content fills (1 = the 1920 x 1080 stage covers the page). Chromium shrinks
 * every page of a print when something in the layout sticks out of the stage (shrink-to-fit); this finds that.
 * Reads Chromium/Skia page content streams: "<a> 0 0 -<a> 0 <h> cm" (points per device pixel) and then the first
 * uniform "q <s> 0 0 <s> 0 0 cm" (device pixels per CSS px): fill = a * s / 0.75 (0.75 pt per CSS px).
 */
function pageFill(buf) {
  const s = buf.toString('latin1');
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const open = s.lastIndexOf(' obj', m.index);
    if (open < 0) continue;
    const dict = s.slice(open, m.index);
    const len = (dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/) || [])[1];
    if (!len || /\/Subtype\s*\/(Image|Form)|\/Type\s*\/(ObjStm|XRef)|\/Length1/.test(dict)) continue;
    const start = re.lastIndex;
    let data = buf.subarray(start, start + Number(len));
    if (/\/FlateDecode/.test(dict)) { try { data = zlib.inflateSync(data); } catch { continue; } }
    const head = data.subarray(0, 4096).toString('latin1');
    const page = head.match(/^\s*([\d.]+) 0 0 -([\d.]+) 0 [\d.]+ cm/);
    if (!page) continue;
    const sc = head.match(/q\s+([\d.]+) 0 0 \1 0 0 cm/);
    if (sc) out.push(Math.round((parseFloat(page[1]) * parseFloat(sc[1]) / 0.75) * 1000) / 1000);
    re.lastIndex = start + Number(len);
  }
  return out;
}

/** Page objects in a PDF, also when they sit in compressed object streams. */
function countPdfPages(buf) {
  const pages = pdfText(buf).match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return pages ? pages.length : 0;
}

/** Runs the lossless pikepdf pass from raw to out. Returns { ok, skipped, info, error }. */
function shrinkPdf(raw, out) {
  // -P: do not put tools/lib on sys.path ahead of the installed packages
  const r = spawnSync('python3', ['-P', SHRINK, raw, out], { encoding: 'utf8' });
  if (r.error) return { ok: false, skipped: 'python3 not found' };
  if (r.status === 3) return { ok: false, skipped: 'pikepdf not installed (pip install --user pikepdf)' };
  if (r.status !== 0) return { ok: false, error: (r.stderr || r.stdout || 'exit ' + r.status).trim() };
  try { return { ok: true, info: JSON.parse(r.stdout.trim().split('\n').pop()) }; } catch { return { ok: true, info: null }; }
}

async function exportPdf(deckFile, outFile, opts) {
  const o = opts || {};
  const { browser, page, info, errors } = await openPrint(deckFile, { paper: !!o.paper, kind: 'pdf' });
  const out = path.resolve(outFile);
  const raw = out + '.' + process.pid + '.raw.pdf';
  let shrink = { ok: false, skipped: 'off (--no-shrink)' };
  try {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.pdf({
      path: raw,
      width: '1920px',
      height: '1080px',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      tagged: true,
      outline: true,
    });
  } finally {
    await browser.close();
  }
  const rawBytes = fs.statSync(raw).size;
  const fill = pageFill(fs.readFileSync(raw));
  if (o.shrink !== false) {
    const tmp = out + '.' + process.pid + '.shrink.pdf';
    shrink = shrinkPdf(raw, tmp);
    if (shrink.ok && shrink.info && shrink.info.pages === countPdfPages(fs.readFileSync(raw)) && fs.statSync(tmp).size < rawBytes) {
      fs.renameSync(tmp, out);
      fs.rmSync(raw, { force: true });
    } else {
      if (shrink.ok) shrink = { ok: false, error: 'the shrunk file was not smaller or lost pages; kept the original' };
      fs.rmSync(tmp, { force: true });
      fs.renameSync(raw, out);
    }
  } else {
    fs.renameSync(raw, out);
  }
  return {
    pages: countPdfPages(fs.readFileSync(out)),
    shrunkPages: fill.map((f, i) => [i + 1, f]).filter(([, f]) => f < 0.999),
    planned: info.slides.length,
    slides: info.count,
    plan: info.slides.map((s) => s.id),
    appendix: info.slides.filter((s) => s.part === 'appendix').length,
    title: info.title,
    errors,
    rawBytes,
    bytes: fs.statSync(out).size,
    shrink,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const paper = args.includes('--paper');
  const shrink = !args.includes('--no-shrink');
  const [inFile, outFile] = args.filter((a) => !a.startsWith('--'));
  if (!inFile || !outFile) {
    console.error('usage: node tools/export-pdf.cjs <deck.html> <out.pdf> [--paper] [--no-shrink]');
    process.exit(2);
  }
  const r = await exportPdf(inFile, outFile, { paper, shrink });
  r.errors.forEach((e) => console.warn('export-pdf: page error: ' + e));
  const mb = (b) => (b / 1e6).toFixed(1) + ' MB';
  const size = r.shrink.ok ? mb(r.rawBytes) + ' -> ' + mb(r.bytes) + ' (lossless pass)' : mb(r.bytes) + (r.shrink.skipped ? ' (size pass skipped: ' + r.shrink.skipped + ')' : '');
  console.log('export-pdf: wrote ' + outFile + ' (' + r.pages + ' pages: ' + (r.planned - r.appendix) + ' main + ' + r.appendix + ' appendix, of ' +
    r.slides + ' slides' + (paper ? ', paper variant' : '') + ', ' + size + ')');
  if (r.shrink.error) console.warn('export-pdf: size pass failed, PDF kept as printed: ' + r.shrink.error);
  if (r.pages !== r.planned) {
    console.error('export-pdf: page count ' + r.pages + ' does not match the export plan (' + r.planned + ' slides)');
    process.exit(1);
  }
  if (r.shrunkPages.length) {
    console.error('export-pdf: Chromium shrank the pages to ' + Math.round(r.shrunkPages[0][1] * 100) + ' % (pages ' + r.shrunkPages.map((x) => x[0]).join(', ') +
      '): an element sticks out of the 1920 x 1080 stage; mark it data-offstage or keep it inside');
    process.exit(1);
  }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { exportPdf, countPdfPages, pdfText, pageFill, shrinkPdf };
