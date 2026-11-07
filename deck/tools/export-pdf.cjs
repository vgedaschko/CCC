#!/usr/bin/env node
/*
 * export-pdf.cjs: one 16:9 page per physical slide, every slide in its final build state.
 *
 *   node tools/export-pdf.cjs <deck.html> <out.pdf>
 *
 * Uses the engine's print mode (?print): all builds shown, triggered elements and live bindings in their
 * data-print defaults, hidden variant slides included and tagged. Chromium prints text as vector text.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { openPrint } = require('./print-page.cjs');

function countPdfPages(buf) {
  const s = buf.toString('latin1');
  const m = s.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return m ? m.length : 0;
}

async function exportPdf(deckFile, outFile) {
  const { browser, page, info, errors } = await openPrint(deckFile);
  try {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    await page.pdf({
      path: outFile,
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
  const pages = countPdfPages(fs.readFileSync(outFile));
  return { pages, slides: info.count, title: info.title, errors };
}

async function main() {
  const [inFile, outFile] = process.argv.slice(2);
  if (!inFile || !outFile) {
    console.error('usage: node tools/export-pdf.cjs <deck.html> <out.pdf>');
    process.exit(2);
  }
  const r = await exportPdf(inFile, outFile);
  r.errors.forEach((e) => console.warn('export-pdf: page error: ' + e));
  console.log('export-pdf: wrote ' + outFile + ' (' + r.pages + ' pages for ' + r.slides + ' slides)');
  if (r.pages !== r.slides) {
    console.error('export-pdf: page count does not match slide count');
    process.exit(1);
  }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { exportPdf, countPdfPages };
