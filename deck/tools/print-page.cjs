/*
 * print-page.cjs: shared helper for the exporters. Opens a deck in print mode (?print, or ?print&paper) in headless
 * Chromium via file:// and waits until deck.js reports ready (fonts loaded, final states rendered).
 * The engine lays the print out as one static export (?print&export=pdf|pptx|all, default pdf): its exportPlan
 * decides which slides are pages and in which order (README "Static exports").
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    console.error('This tool needs Playwright (require("playwright")). It is expected to be installed globally.');
    throw e;
  }
}

/**
 * @param {string} deckFile path to the deck HTML (source or built)
 * @param {{zoom1?: boolean, paper?: boolean, kind?: 'pdf'|'pptx'|'all'}} [opts]  paper: the light paper print
 *   variant (?print&paper); kind: the static export to lay out (default pdf)
 * @returns {Promise<{browser, page, info: {title: string, count: number, kind: string, slides: Array}}>}
 *   info.count = physical slides in the deck; info.slides = the export plan in order
 *   ({ id, pos, title, hidden, part: 'main'|'appendix', tag, text })
 */
async function openPrint(deckFile, opts) {
  const o = opts || {};
  const abs = path.resolve(deckFile);
  if (!fs.existsSync(abs)) throw new Error('deck not found: ' + deckFile);
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const kind = o.kind || 'pdf';
  const url = pathToFileURL(abs).href + '?print&export=' + kind + (o.zoom1 ? '&zoom=1' : '') + (o.paper ? '&paper' : '');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Deck && window.Deck.isReady, null, { timeout: 30000 });
  const info = await page.evaluate((k) => {
    const cfg = (() => { try { return JSON.parse(document.getElementById('deck-config').textContent); } catch { return {}; } })();
    // older engines (no exportPlan): every slide in physical order
    const plan = typeof window.Deck.exportPlan === 'function' ? window.Deck.exportPlan(k)
      : window.Deck.slides.map((s) => ({ id: s.id, pos: s.pos, title: s.title, hidden: s.hidden, part: s.hidden ? 'appendix' : 'main', tag: '' }));
    return {
      title: cfg.title || document.title || 'Deck',
      author: cfg.author || '',
      kind: k,
      count: window.Deck.slides.length,
      slides: plan.map((s) => {
        const el = document.getElementById(s.id);
        const tag = el.querySelector(':scope > .deck-variant-tag');
        if (tag) tag.style.display = 'none';
        const text = (el.innerText || '').split(/\n+/).map((l) => l.trim()).filter(Boolean).join(' · ').replace(/\s+/g, ' ');
        if (tag) tag.style.display = '';
        return Object.assign({}, s, { text });
      }),
    };
  }, kind);
  return { browser, page, info, errors };
}

module.exports = { openPrint, loadPlaywright };
