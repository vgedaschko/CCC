/*
 * print-page.cjs: shared helper for the exporters. Opens a deck in print mode (?print) in headless
 * Chromium via file:// and waits until deck.js reports ready (fonts loaded, final states rendered).
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
 * @param {{zoom1?: boolean}} [opts]
 * @returns {Promise<{browser, page, info: {title: string, count: number, slides: Array}}>}
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
  const url = pathToFileURL(abs).href + '?print' + (o.zoom1 ? '&zoom=1' : '');
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.Deck && window.Deck.isReady, null, { timeout: 30000 });
  const info = await page.evaluate(() => {
    const cfg = (() => { try { return JSON.parse(document.getElementById('deck-config').textContent); } catch { return {}; } })();
    return {
      title: cfg.title || document.title || 'Deck',
      author: cfg.author || '',
      count: window.Deck.slides.length,
      slides: window.Deck.slides.map((s) => {
        const el = document.getElementById(s.id);
        const tag = el.querySelector(':scope > .deck-variant-tag');
        if (tag) tag.style.display = 'none';
        const text = (el.innerText || '').split(/\n+/).map((l) => l.trim()).filter(Boolean).join(' · ').replace(/\s+/g, ' ');
        if (tag) tag.style.display = '';
        return { id: s.id, pos: s.pos, title: s.title, hidden: s.hidden, text };
      }),
    };
  });
  return { browser, page, info, errors };
}

module.exports = { openPrint, loadPlaywright };
