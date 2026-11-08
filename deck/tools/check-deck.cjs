#!/usr/bin/env node
/*
 * check-deck.cjs: automated QA over an assembled deck.
 *
 *   node tools/check-deck.cjs --deck slides/.tmp-g3.html [--slides s09a,s09b] [--json] [--no-pdf] [--no-fonts] [--stress]
 *
 * Per slide, in the live final build state, with each trigger fired alone, with each data-show-if
 * value set, and in print:
 *   bounds      every visible element inside the 1920x1080 stage (data-offstage elements excepted)
 *   overflow    no clipped text (scroll size > box) and no text outside its card / box
 *   overlap     no two visible text boxes overlap, unless an opaque box covers one of them
 *   min-size    visible text >= 28 px
 *   fonts       every rendered glyph comes from a shipped web font (Chrome's own font matching, via CDP);
 *               a fallback is reported with the missing characters
 * Per deck:
 *   builds      <= 6 click builds per slide (and no gaps in data-step numbers)
 *   morph       keys on both sides of every morph transition (singles are reported as notes)
 *   goto        every data-goto / data-next / checkpoint target exists
 *   console     zero console errors (live, navigation through every slide, print)
 *   print       PDF page count == number of slides
 *   stress      (--stress) each text block in turn gets 40 % more words; any new overlap / overflow /
 *               bounds issue is reported as a warning ("a +40 % text edit must not create overlaps").
 *               Skips the running head, the footer and [data-fixed-text] (logo lockups, generated country labels).
 * Slides marked data-stub only produce notes (they never fail the run). Exit code 1 on any error.
 * Safe to run in parallel: own browser, in-memory PDF, no files written.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

function args() {
  const a = process.argv.slice(2);
  const o = { pdf: true, fonts: true };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--deck') o.deck = a[++i];
    else if (a[i] === '--slides') o.slides = a[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a[i] === '--json') o.json = true;
    else if (a[i] === '--no-pdf') o.pdf = false;
    else if (a[i] === '--no-fonts') o.fonts = false;
    else if (a[i] === '--stress') o.stress = true;
    else if (!o.deck && !a[i].startsWith('--')) o.deck = a[i];
  }
  if (!o.deck) {
    console.error('usage: node tools/check-deck.cjs --deck <deck.html> [--slides a,b] [--json] [--no-pdf] [--no-fonts]');
    process.exit(2);
  }
  return o;
}

/* ------------------------------------------------------------------ in-page audit */
// Runs inside the page. Returns { issues: [...], fontTargets: n } and marks text owners with data-ck.
function pageAudit(arg) {
  const { id, state, minPx } = arg;
  const slide = document.getElementById(id);
  slide.scrollIntoView({ block: 'start', inline: 'start' });
  const sr = slide.getBoundingClientRect();
  const issues = [];
  const add = (kind, msg, el, extra) => issues.push(Object.assign({ kind, state, msg, sel: el ? describe(el) : '' }, extra || {}));
  function describe(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (c.length) s += '.' + c.join('.');
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) s += ' "' + (t.length > 40 ? t.slice(0, 40) + '…' : t) + '"';
    return s;
  }
  const ignored = (el) => !!el.closest('[data-check-ignore], .deck-variant-tag, .sr');
  function effOpacity(el) {
    let o = 1;
    for (let e = el; e && e !== slide.parentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  }
  function visible(el) {
    if (ignored(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none') return false;
    if (effOpacity(el) < 0.05) return false;
    return el.getClientRects().length > 0;
  }
  function alpha(color) {
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (!m) return color === 'transparent' ? 0 : 1;
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    return p.length > 3 ? parseFloat(p[3]) : 1;
  }
  function boxed(el) {
    const cs = getComputedStyle(el);
    if (alpha(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none') return true;
    return ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && alpha(cs['border' + s + 'Color']) > 0.05);
  }
  function opaque(el) {
    const cs = getComputedStyle(el);
    return alpha(cs.backgroundColor) >= 0.85;
  }
  const rel = (r) => ({ x: Math.round(r.left - sr.left), y: Math.round(r.top - sr.top), w: Math.round(r.width), h: Math.round(r.height) });
  const T = 2;

  // ---- ink boxes: a text rect spans the font's whole ascent + descent; the glyphs often fill far less
  // (a 560 px "D" has ~100 px of empty line box above it). Trim each rect vertically to the ink of its
  // text, measured with the same font on a canvas, so overlap means overlapping letters.
  const cvs = document.createElement('canvas').getContext('2d');
  function inkRects(rects, text, cs) {
    try {
      cvs.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const m = cvs.measureText(text.trim() || 'x');
      const top = Math.max(0, m.fontBoundingBoxAscent - m.actualBoundingBoxAscent);
      const bot = Math.max(0, m.fontBoundingBoxDescent - m.actualBoundingBoxDescent);
      return rects.map((q) => {
        const t = Math.min(q.top + top, q.bottom - 2);
        const b = Math.max(q.bottom - bot, t + 2);
        return { left: q.left, right: q.right, top: t, bottom: b, width: q.width, height: b - t };
      });
    } catch { return rects; }
  }

  // ---- text runs
  const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const runs = [];
  let ck = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !visible(el)) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') { /* svg <text> */ }
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const cs = getComputedStyle(el);
    if (!el.hasAttribute('data-ck')) el.setAttribute('data-ck', String(++ck));
    runs.push({ el, rects, ink: inkRects(rects, n.nodeValue, cs), text: n.nodeValue, fs: parseFloat(cs.fontSize) });
  }

  // ---- min size
  const seenSize = new Set();
  runs.forEach((r) => {
    if (r.fs < minPx - 0.25 && !seenSize.has(r.el)) {
      seenSize.add(r.el);
      add('min-size', 'text at ' + r.fs.toFixed(1) + ' px (minimum ' + minPx + ' px)', r.el);
    }
  });

  // ---- bounds (elements and text)
  const all = Array.from(slide.querySelectorAll('*')).filter((el) => !(el.closest('svg') && el.tagName.toLowerCase() !== 'svg'));
  all.forEach((el) => {
    if (el.closest('[data-offstage]') || !visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const out = r.left < sr.left - T || r.top < sr.top - T || r.right > sr.right + T || r.bottom > sr.bottom + T;
    if (!out) return;
    // a decorative layer the size of the stage (e.g. axis layers, bells) is fine if what it paints is inside
    if (el.parentElement && el.parentElement.closest('[data-offstage]')) return;
    add('bounds', 'outside the stage at ' + JSON.stringify(rel(r)), el);
  });

  // ---- overflow: clipped text and text outside its box
  runs.forEach((r) => {
    for (let e = r.el; e && e !== slide; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
      if (clips && (e.scrollWidth > e.clientWidth + T || e.scrollHeight > e.clientHeight + T)) {
        add('overflow', 'text is clipped by its box (' + e.scrollWidth + 'x' + e.scrollHeight + ' in ' + e.clientWidth + 'x' + e.clientHeight + ')', e);
        return;
      }
      if (boxed(e) && e !== slide) {
        const b = e.getBoundingClientRect();
        const bad = r.rects.find((q) => q.left < b.left - T || q.top < b.top - T || q.right > b.right + T || q.bottom > b.bottom + T);
        if (bad) add('overflow', 'text spills out of its box ' + describe(e), r.el, { at: rel(bad) });
        return;
      }
    }
  });

  // ---- overlap of text boxes (with occlusion)
  const style = document.createElement('style');
  style.textContent = '#' + CSS.escape(id) + ' * { pointer-events: auto !important; }';
  document.head.appendChild(style);
  function blockOf(el) {
    for (let e = el; e && e !== slide; e = e.parentElement) {
      const d = getComputedStyle(e).display;
      if (d !== 'inline' && d !== 'contents') return e;
    }
    return el;
  }
  const items = [];
  runs.forEach((r) => r.ink.forEach((q) => items.push({ el: r.el, blk: blockOf(r.el), q })));
  const reported = new Set();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.blk === b.blk || a.blk.contains(b.blk) || b.blk.contains(a.blk)) continue;
      const x1 = Math.max(a.q.left, b.q.left);
      const y1 = Math.max(a.q.top, b.q.top);
      const x2 = Math.min(a.q.right, b.q.right);
      const y2 = Math.min(a.q.bottom, b.q.bottom);
      if (x2 - x1 < 4 || y2 - y1 < 4) continue;
      const key = a.blk.getAttribute('data-ck') + '|' + b.blk.getAttribute('data-ck') + '|' + describe(a.blk) + describe(b.blk);
      if (reported.has(key)) continue;
      // occlusion: an opaque box painted above the lower of the two hides it
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const stack = document.elementsFromPoint(cx, cy);
      const idx = (el) => stack.findIndex((s) => s === el || el.contains(s) || s.contains(el));
      const ia = idx(a.el);
      const ib = idx(b.el);
      let hidden = false;
      if (ia >= 0 && ib >= 0) {
        const lower = ia > ib ? a.el : b.el;
        const li = Math.max(ia, ib);
        for (let k = 0; k < li; k++) {
          const s = stack[k];
          if (s.contains(lower) || lower.contains(s)) continue;
          if (opaque(s)) { hidden = true; break; }
        }
      } else if (ia < 0 || ib < 0) hidden = true;
      if (hidden) continue;
      reported.add(key);
      add('overlap', 'text overlaps ' + describe(b.blk) + ' at ' + JSON.stringify({ x: Math.round(cx - sr.left), y: Math.round(cy - sr.top) }), a.blk);
    }
  }
  style.remove();
  return { issues, owners: ck };
}

/* ------------------------------------------------------------------ +40 % text stress (in page) */
// Needs window.__ckAudit (pageAudit injected). Expands one text block at a time by 40 % (repeating its
// own words), audits, restores, and returns the issues that the expansion created.
function stressAudit(arg) {
  const { id } = arg;
  const slide = document.getElementById(id);
  const sig = (x) => x.kind + '|' + x.sel.replace(/"[^"]*"/, '') + '|' + x.msg.replace(/\{[^}]*\}|\d+/g, '#');
  const clean = () => slide.querySelectorAll('[data-ck]').forEach((n) => n.removeAttribute('data-ck'));
  const base = new Set(window.__ckAudit({ id, state: 'stress', minPx: 28 }).issues.map(sig));
  clean();
  const vis = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility === 'visible' && el.getClientRects().length > 0; };
  const blocks = new Set();
  const tw = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 3) });
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    let e = n.parentElement;
    // chrome (running head, footer) and fixed compositions (logo lockups: data-fixed-text) are not edited
    if (!e || e.closest('svg, .sr, [data-check-ignore], [data-fixed-text], .rh, .sf, .deck-variant-tag') || !vis(e)) continue;
    while (e !== slide && getComputedStyle(e).display === 'inline') e = e.parentElement;
    if (e !== slide) blocks.add(e);
  }
  const out = [];
  blocks.forEach((blk) => {
    const nodes = [];
    const w2 = document.createTreeWalker(blk, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 3) });
    for (let n = w2.nextNode(); n; n = w2.nextNode()) nodes.push(n);
    if (!nodes.length) return;
    const text = nodes.map((n) => n.nodeValue).join(' ').replace(/\s+/g, ' ').trim();
    if (text.length < 4) return;
    const words = text.split(' ');
    let add = '';
    for (let i = 0; add.length < text.length * 0.4; i++) add += ' ' + words[i % words.length];
    const last = nodes[nodes.length - 1];
    const keep = last.nodeValue;
    last.nodeValue = keep + add;
    const r = window.__ckAudit({ id, state: 'stress', minPx: 28 });
    last.nodeValue = keep;
    clean();
    const fresh = r.issues.filter((x) => !base.has(sig(x)) && x.kind !== 'min-size');
    const name = blk.tagName.toLowerCase() + (blk.className && typeof blk.className === 'string' ? '.' + blk.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + text.slice(0, 32) + (text.length > 32 ? '…' : '') + '"';
    if (fresh.length) out.push({ kind: 'stress', state: 'stress +40%', sel: name, msg: 'a +40 % edit here creates: ' + fresh.slice(0, 2).map((x) => x.kind + ' ' + x.msg.replace(/ at \{.*$/, '')).join('; ') + (fresh.length > 2 ? ' (+' + (fresh.length - 2) + ' more)' : ''), warn: true });
  });
  return out;
}

/* ------------------------------------------------------------------ fonts via CDP */
async function fontCheck(page, cdp, id, state) {
  const issues = [];
  // DOM.getDocument invalidates earlier node ids, so each owner is looked up afresh by its data-ck mark
  const cks = await page.evaluate((sid) => Array.from(document.querySelectorAll('#' + CSS.escape(sid) + ' [data-ck]')).map((n) => n.getAttribute('data-ck')), id);
  const nodeOf = async (sel) => {
    const d = await cdp.send('DOM.getDocument', { depth: 0 });
    const q = await cdp.send('DOM.querySelector', { nodeId: d.root.nodeId, selector: sel }).catch(() => ({ nodeId: 0 }));
    return q.nodeId;
  };
  for (const ckv of cks) {
    const nodeId = await nodeOf('#' + id + ' [data-ck="' + ckv + '"]');
    if (!nodeId) continue;
    let fonts;
    try { ({ fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })); } catch { continue; }
    const bad = fonts.filter((f) => !f.isCustomFont);
    if (!bad.length) continue;
    // find the characters that fall back: probe each distinct character in a span with the same style
    const chars = await page.evaluate(([sel]) => {
      const el = document.querySelector(sel);
      const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join('');
      return Array.from(new Set(Array.from(own.replace(/\s/g, ''))));
    }, ['#' + id + ' [data-ck="' + ckv + '"]']);
    const missing = [];
    for (const ch of chars) {
      await page.evaluate(([sel, c]) => {
        const el = document.querySelector(sel);
        const s = document.createElement('span');
        s.setAttribute('data-ck-probe', '');
        s.textContent = c;
        el.appendChild(s);
        void s.getBoundingClientRect();
      }, ['#' + id + ' [data-ck="' + ckv + '"]', ch]);
      const pid = await nodeOf('[data-ck-probe]');
      let r = { fonts: [] };
      if (pid) r = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: pid }).catch(() => ({ fonts: [] }));
      await page.evaluate(() => document.querySelectorAll('[data-ck-probe]').forEach((s) => s.remove()));
      if (r.fonts.some((f) => !f.isCustomFont)) missing.push(ch);
    }
    const desc = await page.evaluate((sel) => { const e = document.querySelector(sel); return e.tagName.toLowerCase() + '.' + (e.className && e.className.baseVal == null ? String(e.className).split(/\s+/).slice(0, 2).join('.') : '') + ' "' + e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) + '"'; }, '#' + id + ' [data-ck="' + ckv + '"]');
    issues.push({ kind: 'fonts', state, sel: desc, msg: 'font fallback to ' + bad.map((f) => f.familyName).join(', ') + (missing.length ? ' for ' + missing.map((c) => '"' + c + '" U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(', ') + ' (use an inline SVG icon or a covered character)' : '') });
  }
  return issues;
}

/* ------------------------------------------------------------------ main */
async function main() {
  const o = args();
  const deck = path.resolve(o.deck);
  if (!fs.existsSync(deck)) { console.error('check-deck: not found: ' + o.deck); process.exit(2); }
  const url = pathToFileURL(deck).href;
  const browser = await chromium.launch();
  const consoleErrors = [];
  const issues = [];
  const note = (slide, kind, msg, extra) => issues.push(Object.assign({ slide, kind, msg, state: '', sel: '' }, extra || {}));

  async function open(query, hash, withCdp) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    let cdp = null;
    if (withCdp) {
      // enable the DevTools domains before loading: enabling DOM on a loaded file:// page logs a bogus error
      cdp = await ctx.newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
    }
    page.on('pageerror', (e) => consoleErrors.push((query || 'live') + ': ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /^\[deck\]/.test(m.text()))) consoleErrors.push((query || 'live') + ': ' + m.text()); });
    await page.goto(url + (query || '') + (hash || ''));
    await page.waitForFunction(() => window.Deck && window.Deck.isReady, null, { timeout: 30000 });
    return { ctx, page, cdp };
  }
  const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  const { ctx, page, cdp } = await open('?nomotion', '', true);

  // ---- deck-level structure
  const info = await page.evaluate(() => {
    const slides = window.Deck.slides;
    const byId = new Set(slides.map((s) => s.id));
    const out = { slides, stubs: [], gotos: [], nexts: [], cps: window.Deck.checkpoints, stepGaps: [], keys: {}, triggers: {}, showIf: {} };
    slides.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el.hasAttribute('data-stub')) out.stubs.push(s.id);
      el.querySelectorAll('[data-goto]').forEach((g) => out.gotos.push({ slide: s.id, target: g.getAttribute('data-goto') }));
      const steps = new Set(Array.from(el.querySelectorAll('[data-step]')).map((n) => parseInt(n.getAttribute('data-step'), 10)));
      for (let k = 1; k <= s.steps; k++) if (!steps.has(k)) out.stepGaps.push({ slide: s.id, step: k });
      out.triggers[s.id] = Array.from(new Set(Array.from(el.querySelectorAll('[data-trigger]')).map((t) => t.getAttribute('data-trigger'))));
      const pairs = [];
      el.querySelectorAll('[data-show-if]').forEach((n) => {
        String(n.getAttribute('data-show-if')).split(/\|\||&&/).forEach((term) => {
          const m = term.trim().match(/^!?\s*([A-Za-z0-9_.$-]+)\s*(?:(==|!=|>=|<=|>|<)\s*(.*))?$/);
          if (!m) return;
          const v = m[3] != null ? m[3].trim().replace(/^(["'])(.*)\1$/, '$2') : '1';
          if (!pairs.find((p) => p[0] === m[1] && p[1] === v)) pairs.push([m[1], v]);
        });
      });
      out.showIf[s.id] = pairs;
    });
    out.badGotos = out.gotos.filter((g) => {
      const t = g.target.trim();
      if (['@back', '@next', '@prev'].includes(t)) return false;
      const m = t.match(/^([^/]+?)(?:\/(\d+))?$/);
      if (!m) return true;
      return !(byId.has(m[1]) || (/^\d+$/.test(m[1]) && +m[1] >= 1 && +m[1] <= slides.length));
    });
    out.badNexts = slides.filter((s) => s.next && !byId.has(s.next)).map((s) => ({ slide: s.id, target: s.next }));
    return out;
  });
  const ids = info.slides.map((s) => s.id);
  const scope = o.slides || ids;
  scope.forEach((id) => { if (!ids.includes(id)) { console.error('check-deck: no slide #' + id); process.exit(2); } });
  const inScope = (id) => scope.includes(id);

  info.slides.forEach((s) => {
    if (!inScope(s.id)) return;
    if (s.steps > 6) note(s.id, 'builds', s.steps + ' click builds (maximum 6)');
  });
  info.stepGaps.forEach((g) => inScope(g.slide) && note(g.slide, 'builds', 'no element has data-step="' + g.step + '": a click with no visible change', { warn: true }));
  info.badGotos.forEach((g) => inScope(g.slide) && note(g.slide, 'goto', 'data-goto target "' + g.target + '" does not exist'));
  info.badNexts.forEach((g) => inScope(g.slide) && note(g.slide, 'goto', 'data-next target "' + g.target + '" does not exist'));

  // ---- morph pairs: keys shown at A's final state vs B at step 0, for every way into a morph slide
  const keysAt = async (id, step) => {
    await page.evaluate(([i, s]) => window.Deck.go(i, s), [id, step]);
    await settle(page);
    return page.evaluate((sid) => {
      const el = document.getElementById(sid);
      const shown = (n) => { for (let e = n; e && e !== el; e = e.parentElement) { if (e.hasAttribute('data-step') && !e.classList.contains('is-revealed')) return false; if (e.hasAttribute('data-triggered') && !e.classList.contains('is-triggered')) return false; if (e.classList.contains('is-if-off')) return false; } return true; };
      const keys = Array.from(el.querySelectorAll('[data-morph]')).filter(shown).map((n) => n.getAttribute('data-morph'));
      const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
      return { keys: Array.from(new Set(keys)), dup };
    }, id);
  };
  const edges = [];
  info.slides.forEach((s, i) => {
    let nx = null;
    if (s.next) nx = s.next;
    else for (let j = i + 1; j < info.slides.length; j++) if (!info.slides[j].hidden) { nx = info.slides[j].id; break; }
    if (nx) edges.push([s.id, nx, 'next']);
  });
  info.gotos.forEach((g) => { if (ids.includes(g.target.split('/')[0])) edges.push([g.slide, g.target.split('/')[0], 'goto']); });
  const morphReport = [];
  for (const [a, b, how] of edges) {
    const mb = info.slides.find((s) => s.id === b);
    if (mb.transition !== 'morph' || !(inScope(a) || inScope(b))) continue;
    const ma = info.slides.find((s) => s.id === a);
    const ka = await keysAt(a, ma.steps);
    const kb = await keysAt(b, 0);
    [[a, ka], [b, kb]].forEach(([sid, k]) => k.dup.forEach((d) => inScope(sid) && note(sid, 'morph', 'duplicate data-morph "' + d + '" (keys must be unique within a slide)')));
    const onlyA = ka.keys.filter((k) => !kb.keys.includes(k));
    const onlyB = kb.keys.filter((k) => !ka.keys.includes(k));
    const both = ka.keys.filter((k) => kb.keys.includes(k));
    morphReport.push({ from: a, to: b, how, paired: both, exitOnly: onlyA, enterOnly: onlyB });
  }

  // ---- per-slide layout audits (live)
  async function auditState(id, state) {
    await settle(page);
    const r = await page.evaluate(pageAudit, { id, state, minPx: 28 });
    r.issues.forEach((x) => issues.push(Object.assign({ slide: id }, x)));
    if (o.fonts) (await fontCheck(page, cdp, id, state)).forEach((x) => issues.push(Object.assign({ slide: id }, x)));
    await page.evaluate(() => document.querySelectorAll('[data-ck]').forEach((n) => n.removeAttribute('data-ck')));
  }
  if (o.stress) await page.addScriptTag({ content: 'window.__ckAudit = ' + pageAudit.toString() + ';' });
  for (const s of info.slides) {
    if (!inScope(s.id)) continue;
    await page.evaluate(() => window.Deck.reset());
    await page.evaluate(([i, st]) => window.Deck.go(i, st), [s.id, s.steps]);
    await auditState(s.id, 'final');
    if (o.stress) {
      await settle(page);
      (await page.evaluate(stressAudit, { id: s.id })).forEach((x) => issues.push(Object.assign({ slide: s.id }, x)));
    }
    for (const t of info.triggers[s.id]) {
      await page.evaluate(() => window.Deck.reset());
      await page.evaluate(([i, st]) => window.Deck.go(i, st), [s.id, s.steps]);
      await page.evaluate((name) => window.Deck.trigger(name), t);
      await auditState(s.id, 'trigger ' + t);
    }
    for (const [k, v] of info.showIf[s.id]) {
      await page.evaluate(() => window.Deck.reset());
      await page.evaluate(([kk, vv]) => window.Deck.store.set(kk, vv), [k, v]);
      await page.evaluate(([i, st]) => window.Deck.go(i, st), [s.id, s.steps]);
      await auditState(s.id, k + '=' + v);
    }
  }
  await page.evaluate(() => window.Deck.reset());
  await ctx.close();

  // ---- print: layout + page count
  const pr = await open('?print&zoom=1');
  for (const s of info.slides) {
    if (!inScope(s.id)) continue;
    const r = await pr.page.evaluate(pageAudit, { id: s.id, state: 'print', minPx: 28 });
    r.issues.forEach((x) => issues.push(Object.assign({ slide: s.id }, x)));
  }
  let pages = null;
  if (o.pdf) {
    const buf = await pr.page.pdf({ width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
    pages = (buf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
    if (pages !== ids.length) note('', 'print', 'PDF has ' + pages + ' pages for ' + ids.length + ' slides');
  }
  await pr.ctx.close();
  await browser.close();
  consoleErrors.forEach((e) => note('', 'console', e));

  // ---- report
  const stubs = new Set(info.stubs);
  issues.forEach((x) => {
    x.level = x.warn ? 'warn' : 'error';
    if (x.slide && stubs.has(x.slide)) x.level = 'stub';
  });
  const errors = issues.filter((x) => x.level === 'error');
  const result = { deck: o.deck, slides: ids.length, scope: o.slides || 'all', stubs: info.stubs, pages, issues, morph: morphReport };
  if (o.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('check-deck: ' + o.deck + ' · ' + ids.length + ' slides · scope ' + (o.slides ? o.slides.join(',') : 'all') + (pages != null ? ' · PDF ' + pages + ' pages' : ''));
    const order = (id) => (id ? ids.indexOf(id) : -1);
    issues.slice().sort((a, b) => order(a.slide) - order(b.slide)).forEach((x) => {
      if (x.level === 'stub') return;
      console.log('  ' + (x.slide || 'deck').padEnd(6) + ' ' + x.level.toUpperCase().padEnd(5) + ' ' + x.kind.padEnd(8) + ' ' + x.msg + (x.sel ? '  [' + x.sel + ']' : '') + (x.state ? '  {' + x.state + '}' : ''));
    });
    const stubCount = issues.filter((x) => x.level === 'stub').length;
    morphReport.forEach((m) => {
      if (!m.exitOnly.length && !m.enterOnly.length) return;
      console.log('  morph  ' + m.from + ' -> ' + m.to + ' (' + m.how + '): paired ' + m.paired.length + (m.exitOnly.length ? ' · only on ' + m.from + ': ' + m.exitOnly.join(' ') : '') + (m.enterOnly.length ? ' · only on ' + m.to + ': ' + m.enterOnly.join(' ') : ''));
    });
    console.log('summary: ' + errors.length + ' error(s), ' + issues.filter((x) => x.level === 'warn').length + ' warning(s), ' +
      stubCount + ' note(s) on ' + info.stubs.filter(inScope).length + ' stub slide(s) (not shown)');
  }
  // exitCode, not exit(): a piped stdout must be flushed before the process ends
  process.exitCode = errors.length ? 1 : 0;
}

main().catch((e) => { console.error('check-deck: ' + (e && e.stack || e)); process.exit(1); });
