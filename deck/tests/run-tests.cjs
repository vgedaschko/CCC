#!/usr/bin/env node
/*
 * run-tests.cjs: automated Playwright suite for deck.js against slides/demo.html over file://.
 *
 *   node tests/run-tests.cjs            run everything
 *   node tests/run-tests.cjs presenter  run only tests whose name contains "presenter"
 *
 * Uses the globally installed Playwright (require('playwright')). Exit code 1 on any failure.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const DECK = path.resolve(__dirname, '..');
const DEMO = path.join(DECK, 'slides', 'demo.html');
const DEMO_URL = pathToFileURL(DEMO).href;
const OUT = path.join(DECK, 'dist', 'test');
const FILTER = process.argv[2] || '';
const SLIDE_COUNT = 12;
// static exports of the demo (engine exportPlan): the PDF leaves out the auto bridge s04z and the PPTX-only end copy
// s07e and moves the hidden slides to an appendix; the PPTX leaves out s04z only, in physical order
const PDF_PLAN = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's02m', 's06m', 'h1'];
const PPTX_PLAN = ['s01', 's02', 's02m', 's03', 's04', 's05', 's06', 's06m', 's07', 'h1', 's07e'];
const { countPdfPages, pdfText, pageFill } = require(path.join(DECK, 'tools', 'export-pdf.cjs'));

const tests = [];
const consoleErrors = [];
let browser;

function test(name, fn) { tests.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg || 'mismatch') + ': expected ' + e + ', got ' + a);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[' + label + '] ' + m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('[' + label + '] uncaught: ' + e.message));
}

async function open(opts) {
  const o = opts || {};
  const context = await browser.newContext({
    viewport: o.viewport || { width: 1920, height: 1080 },
    reducedMotion: o.reducedMotion || 'no-preference',
  });
  context.on('page', (p) => watch(p, 'popup'));
  if (o.init) await context.addInitScript(o.init);
  const page = await context.newPage();
  watch(page, o.label || 'deck');
  await page.goto((o.url || DEMO_URL) + (o.query || '') + (o.hash || ''));
  await page.waitForFunction(() => window.Deck && window.Deck.isReady);
  return { context, page };
}

const where = async (page) => page.evaluate(() => { const s = window.Deck.state(); return s.id + '/' + s.step; });
const goTo = (page, id, step) => page.evaluate(([i, s]) => window.Deck.go(i, s), [id, step || 0]);
const settle = (page) => page.waitForFunction(() => !document.documentElement.classList.contains('deck-vt') && !document.querySelector('.slide.deck-leaving'));
const activeIds = (page) => page.evaluate(() => Array.from(document.querySelectorAll('#stage .slide.is-active')).map((s) => s.id));
const visible = (page, sel) => page.evaluate((q) => {
  const n = document.querySelector(q);
  if (!n) return null;
  const cs = getComputedStyle(n);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && n.getClientRects().length > 0;
}, sel);
const text = (page, sel) => page.evaluate((q) => { const n = document.querySelector(q); return n ? n.textContent.trim() : null; }, sel);
async function typeNumber(page, n) {
  for (const ch of String(n)) await page.keyboard.press(ch);
  await page.keyboard.press('Enter');
}
async function withDeck(opts, fn) {
  const { context, page } = await open(opts);
  try { await fn(page, context); } finally { await context.close(); }
}

/* ------------------------------------------------------------------ basics */

test('loads the demo: 12 slides, slide 1 active, config read', async () => {
  await withDeck({}, async (page) => {
    const info = await page.evaluate(() => ({ n: Deck.slides.length, mode: Deck.mode, cps: Deck.checkpoints, hidden: Deck.slides.filter((s) => s.hidden).map((s) => s.id) }));
    eq(info.n, SLIDE_COUNT, 'slide count');
    eq(info.mode, 'audience', 'mode');
    eq(info.hidden, ['s02m', 's06m', 'h1'], 'hidden slides');
    eq(info.cps.map((c) => c.slide + '@' + c.by), ['s04@90', 's06@180'], 'checkpoints');
    eq(await where(page), 's01/0', 'start');
    eq(await activeIds(page), ['s01'], 'only s01 active');
  });
});

test('next/prev across builds and slides (Prev un-reveals the last build)', async () => {
  await withDeck({}, async (page) => {
    await page.keyboard.press('ArrowRight');
    eq(await where(page), 's02/0', 'into s02');
    assert(!(await visible(page, '#s02 .ceo')), 'build 1 hidden at step 0');
    for (let i = 1; i <= 4; i++) {
      await page.keyboard.press('ArrowRight');
      eq(await where(page), 's02/' + i, 'build ' + i);
    }
    await settle(page);
    await sleep(600);
    assert(await visible(page, '#s02 .arrows'), 'step 4 element visible');
    assert(await visible(page, '#s02 .ceo'), 'step 1 element visible');
    await page.keyboard.press('ArrowRight');
    eq(await where(page), 's03/0', 'next slide skips hidden s02m');
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's02/4', 'prev lands on final build of s02');
    await settle(page);
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's02/3', 'prev un-reveals build 4');
    eq(await visible(page, '#s02 .arrows'), false, 'step-4 arrows hidden again');
    assert(await visible(page, '#s02 .card-mw'), 'step-3 card still visible');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's02/0', 'back to step 0');
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's01/0', 'back to s01');
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's01/0', 'prev on the first slide is a no-op');
  });
});

test('each clicker key: Right/Down/PageDown/Space/Enter forward, Left/Up/PageUp/Backspace back, click on empty stage', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's02', 0);
    let step = 0;
    for (const key of ['ArrowRight', 'ArrowDown', 'PageDown', 'Space', 'Enter']) {
      await page.keyboard.press(key);
      step += 1;
      if (step > 4) break;
      eq(await where(page), 's02/' + step, key + ' advances one build');
    }
    eq(await where(page), 's03/0', 'fifth forward key leaves s02');
    await goTo(page, 's02', 4);
    await page.keyboard.press('Shift+Space');
    eq(await where(page), 's02/3', 'Shift+Space goes back');
    await goTo(page, 's02', 4);
    step = 4;
    for (const key of ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']) {
      await page.keyboard.press(key);
      step -= 1;
      eq(await where(page), 's02/' + step, key + ' goes back one build');
    }
    await page.mouse.click(1900, 20); // empty corner of the stage
    eq(await where(page), 's02/1', 'click on empty stage advances');
    await page.click('#s02 .tile-ny');
    eq(await where(page), 's02/2', 'click on non-interactive content advances too');
  });
});

test('rapid keypresses during transitions are neither dropped nor doubled', async () => {
  await withDeck({}, async (page) => {
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    // s01 -> s02/0..4 (5) -> s03/0 (6) -> s03/1 (7) -> s03/2 (8)
    eq(await where(page), 's03/2', 'eight presses, eight moves');
    await settle(page);
    eq(await activeIds(page), ['s03'], 'one active slide after the burst');
    for (let i = 0; i < 8; i++) await page.keyboard.press('PageUp');
    eq(await where(page), 's01/0', 'eight presses back return to the start');
    await settle(page);
    eq(await activeIds(page), ['s01'], 'one active slide after the burst back');
    const names = await page.evaluate(() => Array.from(document.querySelectorAll('[data-morph]')).filter((n) => n.style.viewTransitionName).length);
    eq(names, 0, 'no view-transition-name left behind');
  });
});

/* -------------------------------------------------- hidden, jump, goto, back */

test('hidden slides: skipped linearly, reachable by number; data-next; Home/End', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's02', 4);
    await page.keyboard.press('ArrowRight');
    eq(await where(page), 's03/0', 'linear next skips s02m');
    await typeNumber(page, 3);
    eq(await where(page), 's02m/0', 'typing 3 + Enter jumps to the hidden variant');
    for (let i = 1; i <= 3; i++) await page.keyboard.press('PageDown');
    eq(await where(page), 's02m/3', 'variant builds');
    await page.keyboard.press('PageDown');
    eq(await where(page), 's03/0', 'data-next on the variant leads to s03');
    await page.keyboard.press('PageUp');
    eq(await where(page), 's02m/3', 'prev returns to the variant it came from');
    await typeNumber(page, 11);
    eq(await where(page), 'h1/0', 'two-digit jump to hidden hub (11)');
    await typeNumber(page, 99);
    eq(await where(page), 'h1/0', 'out-of-range jump does nothing');
    await page.keyboard.press('Home');
    eq(await where(page), 's01/0', 'Home');
    await page.keyboard.press('End');
    eq(await where(page), 's07e/0', 'End goes to the last visible slide');
    await goTo(page, 's06', 1);
    await page.keyboard.press('ArrowRight');
    eq(await where(page), 's07/0', 's06 -> s07 skips hidden s06m');
  });
});

test('goto hotspot sets state and jumps; @back returns to the last slide viewed; tile goto with step', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's02', 0);
    await page.click('#s02 [data-goto="s02m"]');
    eq(await where(page), 's02m/0', 'chip jumps to the variant');
    eq(await page.evaluate(() => Deck.store.get('decision1.first')), 'Munich', 'chip data-set applied');
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's02/0', 'prev from a jumped-to slide returns where it came from, at the build it left (s02/0)');
    await goTo(page, 's02', 2);
    await settle(page);
    await page.click('#s02 [data-goto="s02m"]');
    eq(await where(page), 's02m/0', 'chip jumps again (from build 2)');
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's02/2', 'prev returns to build 2, not to the final state (no build is given away)');
    await goTo(page, 's07', 3);
    await settle(page);
    await page.click('#s07 [data-goto="h1"]');
    eq(await where(page), 'h1/0', 'tiny corner chip to the hidden hub');
    await settle(page);
    await page.click('#h1 [data-goto="@back"]');
    eq(await where(page), 's07/3', '← back returns to the last slide viewed');
    await settle(page);
    await page.click('#s07 [data-goto="h1"]');
    await settle(page);
    await page.click('#h1 [data-goto="s03/2"]');
    eq(await where(page), 's03/2', 'tile jumps to s03 build 2');
  });
});

/* ---------------------------------------------------- timers and triggers */

test('timer: starts on reveal, counts down, survives navigating away and back', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's04', 0);
    await settle(page);
    eq(await page.getAttribute('#clock2', 'data-timer-state'), 'idle', 'idle before reveal');
    eq(await text(page, '#clock2 [data-timer-text]'), '2:00', 'shows full duration');
    await page.keyboard.press('ArrowRight');
    eq(await page.getAttribute('#clock2', 'data-timer-state'), 'running', 'running after reveal');
    await sleep(1300);
    const t1 = await text(page, '#clock2 [data-timer-text]');
    assert(/^1:5[89]$/.test(t1), 'counts down m:ss, got ' + t1);
    const p1 = parseFloat(await page.evaluate(() => document.getElementById('clock2').style.getPropertyValue('--deck-progress')));
    assert(p1 > 0 && p1 < 0.05, 'progress bar moves, got ' + p1);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // -> bridge -> auto -> s05
    await page.waitForFunction(() => Deck.state().id === 's05');
    await sleep(300);
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's04/3', 'back on s04 (bridge skipped)');
    const tm = await page.evaluate(() => Deck.timers().clock2);
    assert(tm && tm.running && tm.elapsed >= 1.5, 'same timer still running, elapsed ' + (tm && tm.elapsed));
    eq(await page.getAttribute('#clock2', 'data-timer-state'), 'running', 'state after returning');
  });
});

test('timer: Prev that un-reveals a running timer resets it; re-reveal restarts at 2:00', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's04', 1);
    await sleep(1100);
    assert((await page.evaluate(() => Deck.timers().clock2.elapsed)) > 1, 'running');
    await page.keyboard.press('ArrowLeft');
    eq(await page.evaluate(() => Deck.timers().clock2 || null), null, 'timer reset by undoing its build');
    eq(await page.getAttribute('#clock2', 'data-timer-state'), 'idle', 'idle again');
    await page.keyboard.press('ArrowRight');
    eq(await text(page, '#clock2 [data-timer-text]'), '2:00', 'restarts from the top');
  });
});

test('triggers: stamp reveals with cover, sets state, stops the timer, stores elapsed; groups are exclusive', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's04', 1);
    await settle(page);
    eq(await visible(page, '#s04 [data-triggered="dT"]'), false, 'stamp hidden before trigger');
    await sleep(1200);
    await page.click('#s04 [data-trigger="dT"]');
    eq(await where(page), 's04/1', 'a trigger click does not advance');
    await sleep(500);
    assert(await visible(page, '#s04 [data-triggered="dT"]'), 'D stamp on T visible');
    assert(await visible(page, '#s04 .decided'), '"decided" cover visible (listed under several triggers)');
    eq(await page.getAttribute('#s04 [data-trigger="dT"]', 'aria-pressed'), 'true', 'chip pressed');
    const st = await page.evaluate(() => Deck.store.all());
    eq([st['decision2.result'], st['decision2.scenario']], ['D', 'T'], 'state set');
    assert(/^0:0[12]$/.test(st['decision2.elapsed']), 'elapsed stored as m:ss, got ' + st['decision2.elapsed']);
    assert(+st['decision2.elapsed_s'] >= 1, 'elapsed seconds stored');
    eq(await page.getAttribute('#clock2', 'data-timer-state'), 'stopped', 'timer stopped');
    const frozen = await text(page, '#clock2 [data-timer-text]');
    await sleep(1100);
    eq(await text(page, '#clock2 [data-timer-text]'), frozen, 'stopped timer is frozen');
    await page.click('#s04 [data-trigger="vM"]');
    await sleep(400);
    eq(await visible(page, '#s04 [data-triggered="dT"]'), false, 'grouped: D/T stamp replaced');
    assert(await visible(page, '#s04 [data-triggered="vM"]'), 'VOTE on M visible');
    const st2 = await page.evaluate(() => Deck.store.all());
    eq([st2['decision2.result'], st2['decision2.scenario'], st2['decision2.elapsed']], ['V', 'M', st['decision2.elapsed']], 'state updated, elapsed kept');
    await goTo(page, 's03', 0);
    await goTo(page, 's04', 3);
    await settle(page);
    assert(await visible(page, '#s04 [data-triggered="vM"]'), 'fired trigger survives navigation');
  });
});

test('state: data-bind and data-show-if on later slides follow the live store', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's05', 4);
    await settle(page);
    assert(await visible(page, '#s05 [data-show-if="!decision2.result"]'), 'no-result pill visible on fresh state');
    eq(await visible(page, '#s05 [data-show-if="decision2.result==D"]'), false, 'D pill hidden on fresh state');
    eq(await text(page, '#s05 .bind-elapsed'), '–:––', 'bind keeps its markup default when unset');
    await goTo(page, 's04', 1);
    await sleep(1100);
    await page.click('#s04 [data-trigger="dM"]');
    const elapsed = await page.evaluate(() => Deck.store.get('decision2.elapsed'));
    await goTo(page, 's05', 4);
    await settle(page);
    eq(await text(page, '#s05 .bind-elapsed'), elapsed, 'elapsed bound');
    eq(await text(page, '#s05 .bind-scenario'), 'M', 'scenario bound');
    assert(await visible(page, '#s05 [data-show-if="decision2.result==D"]'), 'D pill visible');
    eq(await visible(page, '#s05 [data-show-if="decision2.result==V"]'), false, 'V pill hidden');
    eq(await visible(page, '#s05 [data-print-only]'), false, 'print-only placeholder hidden live');
    await goTo(page, 's06', 0);
    await settle(page);
    eq(await visible(page, '#s06 .scard-t'), false, 'T card hidden because scenario==M');
    assert(await visible(page, '#s06 .hint'), 'M hint visible');
    await page.evaluate(() => Deck.store.set('decision2.scenario', 'T'));
    assert(await visible(page, '#s06 .scard-t'), 'T card back after store change');
    eq(await visible(page, '#s06 .hint'), false, 'hint hidden after store change');
    await goTo(page, 's07', 0);
    await settle(page);
    await page.click('#s07 [data-trigger="dS20"]');
    await goTo(page, 's07', 3);
    eq(await text(page, '#s07 .bind-close'), 'D', 'ungrouped trigger set close.result');
  });
});

test('entrance effects play going forward only (builds, triggers, data-enter), never on backward entry', async () => {
  await withDeck({}, async (page) => {
    await page.evaluate(() => {
      window.__anims = [];
      document.addEventListener('animationstart', (e) => {
        if (e.animationName.startsWith('deck-') && !e.target.classList.contains('slide')) window.__anims.push(Array.from(e.target.classList).filter((c) => !/^(is|deck)-/.test(c)).pop() + ':' + e.animationName);
      });
    });
    await goTo(page, 's02', 0);
    await settle(page);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.__anims.length >= 2);
    const a1 = await page.evaluate(() => window.__anims.splice(0));
    assert(a1.includes('ceo:deck-slam') && a1.includes('sliver:deck-wipe'), 'step 1 builds animate: ' + a1);
    await goTo(page, 's03', 2);
    await settle(page);
    await page.evaluate(() => window.__anims.splice(0));
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.__anims.some((a) => a.startsWith('mail:')));
    const a2 = await page.evaluate(() => window.__anims.splice(0));
    assert(a2.includes('mail:deck-drop'), 'data-enter plays on forward entry: ' + a2);
    await page.keyboard.press('ArrowRight');
    await sleep(200);
    await page.evaluate(() => window.__anims.splice(0));
    await page.click('#s04 [data-trigger="vT"]');
    await page.waitForFunction(() => window.__anims.some((a) => a.includes('deck-slam')));
    const a3 = await page.evaluate(() => window.__anims.splice(0));
    assert(a3.includes('stamp-v:deck-slam') && a3.includes('decided:deck-fade'), 'triggered elements animate in: ' + a3);
    await goTo(page, 's04', 3); // leave s04 at its last build: Prev after a jump returns to the build that was left
    await settle(page);
    await goTo(page, 's05', 0);
    await settle(page);
    await page.evaluate(() => window.__anims.splice(0));
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's04/3', 'backward entry at the final build');
    await settle(page);
    await sleep(200);
    eq(await page.evaluate(() => window.__anims), [], 'nothing animates when entering backward');
    assert(await visible(page, '#s04 .mueller') && await visible(page, '#s04 .mail'), 'final state shown at once');
  });
});

test('deck config: clickAdvance false (only hotspots react), clockLead counts the opening slide in, Shift+R asks twice mid-talk, quiet jump overlay with a presenter, presenter preview skips an auto bridge', async () => {
  const init = () => { window.DECK_CONFIG = { clickAdvance: false, clockLead: 30 }; };
  await withDeck({ init }, async (page, context) => {
    // the first advance on the opening slide starts the clock at clockLead
    await page.keyboard.press('ArrowRight');
    const c = await page.evaluate(() => Deck.clock.elapsed());
    assert(c >= 30000 && c < 33000, 'clock counts S01 in: ' + c);
    // a click on the empty stage does nothing; a hotspot still works; a click lifts the black screen
    await page.mouse.click(1900, 20);
    eq(await where(page), 's02/0', 'a click off a hotspot does not advance');
    await page.click('#s02 [data-goto="s02m"]');
    eq(await where(page), 's02m/0', 'a hotspot still works');
    await page.keyboard.press('b');
    assert(await page.evaluate(() => document.documentElement.classList.contains('deck-is-black')), 'black on');
    await page.mouse.click(960, 540);
    assert(!(await page.evaluate(() => document.documentElement.classList.contains('deck-is-black'))), 'a click lifts the black screen');
    eq(await where(page), 's02m/0', '... without advancing');
    // Shift+R with the clock past 1:00: the first press only asks
    await page.evaluate(() => { Deck.store.set('x', '1'); Deck.clock.set(90000); });
    await page.keyboard.press('Shift+R');
    eq(await page.evaluate(() => Deck.store.get('x')), '1', 'first Shift+R mid-talk resets nothing');
    assert(/again/.test(await text(page, '.deck-toast')), 'toast asks for a second press');
    await page.keyboard.press('Shift+R');
    eq(await page.evaluate(() => [Deck.store.get('x'), Deck.clock.elapsed()]), [undefined, 0], 'second Shift+R resets');
    // presenter: the Next preview looks past the auto bridge; a number typed in the deck window stays quiet on the beamer
    await goTo(page, 's04', 3);
    const [pres] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('p')]);
    await pres.waitForLoadState('load');
    await pres.waitForFunction(() => document.documentElement.classList.contains('dp-connected'), null, { timeout: 5000 });
    await pres.waitForFunction(() => /s05/.test(document.querySelector('.dp-next .dp-caption').textContent));
    assert(/after the auto bridge/.test(await text(pres, '.dp-next .dp-caption')), 'next label: ' + await text(pres, '.dp-next .dp-caption'));
    const nextFrame = pres.frame({ url: /embed=next/ });
    await nextFrame.waitForFunction(() => Deck.state().id === 's05');
    await page.bringToFront();
    await page.keyboard.press('1');
    await page.keyboard.press('1');
    eq(await text(page, '.deck-jump'), '→ 11', 'the beamer shows only the digits');
    await page.keyboard.press('Escape');
    await pres.keyboard.press('1');
    await pres.keyboard.press('1');
    assert(/h1/.test(await text(pres, '.deck-jump')), 'the presenter shows the target: ' + await text(pres, '.deck-jump'));
    await pres.keyboard.press('Escape');
    await pres.close();
  });
});

test('Shift+R resets live outcomes, timers, triggers and the talk clock', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's04', 1);
    await page.click('#s04 [data-trigger="dM"]');
    assert(await page.evaluate(() => Deck.store.get('decision2.result') === 'D' && Deck.clock.elapsed() >= 0), 'state set');
    await page.keyboard.press('Shift+R');
    const r = await page.evaluate(() => ({ store: Deck.store.all(), fired: document.querySelectorAll('#s04 .is-triggered').length, clock: Deck.clock.elapsed() }));
    eq(r.store, {}, 'store cleared');
    eq(r.fired, 0, 'stamps cleared');
    eq(r.clock, 0, 'clock reset');
    eq(await page.getAttribute('#clock2', 'data-timer-state'), 'running', 'revealed timer restarts fresh');
    assert((await page.evaluate(() => Deck.timers().clock2.elapsed)) < 1, 'fresh timer');
  });
});

/* ----------------------------------------------------------- transitions */

const VT_SPY = () => {
  const orig = Document.prototype.startViewTransition;
  window.__vt = { calls: 0, old: [], fresh: [], same: [] };
  if (!orig) return;
  Document.prototype.startViewTransition = function (arg) {
    const cb = typeof arg === 'function' ? arg : arg && arg.update;
    window.__vt.calls += 1;
    window.__vt.old.push(Array.from(document.querySelectorAll('[data-morph]')).map((n) => n.style.viewTransitionName).filter(Boolean));
    const wrapped = () => {
      const r = cb ? cb() : undefined;
      window.__vt.fresh.push(Array.from(document.querySelectorAll('[data-morph]')).map((n) => n.style.viewTransitionName).filter(Boolean));
      window.__vt.same.push(Array.from(document.querySelectorAll('[data-morph-same]')).map((n) => n.closest('.slide').id + ':' + n.getAttribute('data-morph')));
      return r;
    };
    return orig.call(this, wrapped);
  };
};

test('morph uses the View Transitions API when available, with names from data-morph', async () => {
  await withDeck({ init: VT_SPY }, async (page) => {
    assert(await page.evaluate(() => typeof document.startViewTransition === 'function'), 'browser supports VT');
    await page.keyboard.press('ArrowRight');
    await settle(page);
    const vt = await page.evaluate(() => window.__vt);
    eq(await page.evaluate(() => Deck.lastTransition), 'view-transition', 'engine reports the VT path');
    assert(vt.calls === 1, 'startViewTransition called once, got ' + vt.calls);
    assert(vt.old[0].includes('deck-m-title') && vt.old[0].includes('deck-m-tileNY'), 'old slide named: ' + vt.old[0]);
    assert(vt.fresh[0].includes('deck-m-title') && vt.fresh[0].includes('deck-m-tileMU'), 'new slide named: ' + vt.fresh[0]);
    assert(!vt.fresh[0].includes('deck-m-clockTD'), 'unrevealed builds are not named');
    eq(await page.evaluate(() => Array.from(document.querySelectorAll('[data-morph]')).filter((n) => n.style.viewTransitionName).length), 0, 'names cleared after the transition');
    await goTo(page, 's04', 3);
    await settle(page);
    await page.keyboard.press('ArrowRight'); // fade to the bridge
    await settle(page);
    const vt2 = await page.evaluate(() => window.__vt);
    eq(vt2.old[vt2.old.length - 1].length, 0, 'fade transition uses no morph names');
  });
});

test('fallback crossfade when the View Transitions API is stubbed out', async () => {
  const stub = () => { delete Document.prototype.startViewTransition; Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true }); };
  await withDeck({ init: stub }, async (page) => {
    eq(await page.evaluate(() => typeof document.startViewTransition), 'undefined', 'API removed');
    await page.keyboard.press('ArrowRight');
    eq(await page.evaluate(() => Deck.lastTransition), 'fallback', 'engine reports the fallback');
    const during = await page.evaluate(() => ({ leaving: !!document.querySelector('#s01.deck-leaving'), fadingIn: !!document.querySelector('#s02.deck-xfade-in') }));
    eq(during, { leaving: true, fadingIn: true }, 'old slide fades out over the new one');
    await sleep(600);
    eq(await activeIds(page), ['s02'], 'one active slide after the crossfade');
    eq(await page.evaluate(() => !!document.querySelector('.deck-leaving')), false, 'leaving class removed');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    eq(await where(page), 's03/1', 'rapid presses also fine in fallback mode');
    await sleep(600);
    eq(await activeIds(page), ['s03'], 'one active slide');
  });
});

test('prefers-reduced-motion: instant swaps, no build animation', async () => {
  await withDeck({ reducedMotion: 'reduce', init: VT_SPY }, async (page) => {
    await page.keyboard.press('ArrowRight');
    eq(await page.evaluate(() => Deck.lastTransition), 'instant', 'instant swap');
    eq(await page.evaluate(() => window.__vt.calls), 0, 'VT not used');
    await page.keyboard.press('ArrowRight');
    eq(await page.evaluate(() => document.querySelectorAll('#s02 .deck-anim').length), 0, 'no animation classes');
    assert(await visible(page, '#s02 .ceo'), 'build shown at once');
  });
});

test('auto-advance bridge, and Prev skips it', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's04', 3);
    await settle(page);
    await page.keyboard.press('ArrowRight');
    eq(await where(page), 's04z/0', 'on the bridge');
    const t0 = Date.now();
    await page.waitForFunction(() => Deck.state().id === 's05', null, { timeout: 4000 });
    const dt = Date.now() - t0;
    assert(dt >= 350, 'waited for data-auto (400 ms), took ' + dt);
    await settle(page);
    await page.keyboard.press('ArrowLeft');
    eq(await where(page), 's04/3', 'prev skips the bridge');
    await sleep(700);
    eq(await where(page), 's04/3', 'no bounce back to s05');
  });
});

test('URL hash keeps the position (#s05/2) and a reload resumes, live state included', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's05', 2);
    eq(await page.evaluate(() => location.hash), '#s05/2', 'hash written');
    await page.evaluate(() => Deck.store.set('decision2.result', 'V'));
    await page.reload();
    await page.waitForFunction(() => window.Deck && window.Deck.isReady);
    eq(await where(page), 's05/2', 'reload resumes');
    eq(await page.evaluate(() => Deck.store.get('decision2.result')), 'V', 'live store survives reload');
    eq(await activeIds(page), ['s05'], 'resumed slide shown');
  });
  await withDeck({ hash: '#s03/1' }, async (page) => {
    eq(await where(page), 's03/1', 'opening with a hash');
    await page.evaluate(() => { location.hash = '#s06'; });
    await page.waitForFunction(() => Deck.state().id === 's06');
    eq(await where(page), 's06/0', 'manual hash edit navigates');
  });
});

test('blackout with b and "."; any nav key only lifts it', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's02', 1);
    await page.keyboard.press('b');
    assert(await visible(page, '.deck-black'), 'black on with b');
    await page.keyboard.press('ArrowRight');
    eq(await visible(page, '.deck-black'), false, 'next lifts black');
    eq(await where(page), 's02/1', 'without moving');
    await page.keyboard.press('.');
    assert(await visible(page, '.deck-black'), 'black on with .');
    await page.keyboard.press('.');
    eq(await visible(page, '.deck-black'), false, '. toggles off');
    await page.keyboard.press('B');
    await page.mouse.click(10, 10);
    eq(await visible(page, '.deck-black'), false, 'click lifts black');
    eq(await where(page), 's02/1', 'click on black did not advance');
  });
});

test('help overlay (?) and fullscreen (F)', async () => {
  await withDeck({}, async (page) => {
    await page.keyboard.press('Shift+Slash');
    assert(await visible(page, '.deck-help'), 'help open');
    assert((await text(page, '.deck-help')).includes('black screen'), 'help lists keys');
    await page.keyboard.press('ArrowRight');
    eq(await visible(page, '.deck-help'), false, 'any key closes help');
    eq(await where(page), 's01/0', 'closing help did not advance');
    await page.keyboard.press('f');
    await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 2000 });
    await page.keyboard.press('f');
    await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 2000 });
  });
});

test('scale-to-fit: 1920x1080, 1280x800 (16:10) and 1024x768 (4:3) letterbox without scrolling', async () => {
  const cases = [
    { vw: 1920, vh: 1080, w: 1920, h: 1080, x: 0, y: 0 },
    { vw: 1280, vh: 800, w: 1280, h: 720, x: 0, y: 40 },
    { vw: 1024, vh: 768, w: 1024, h: 576, x: 0, y: 96 },
  ];
  for (const c of cases) {
    await withDeck({ viewport: { width: c.vw, height: c.vh } }, async (page) => {
      const r = await page.evaluate(() => {
        const b = document.getElementById('stage').getBoundingClientRect();
        const se = document.scrollingElement;
        return { x: b.x, y: b.y, w: b.width, h: b.height, sw: se.scrollWidth, sh: se.scrollHeight, iw: innerWidth, ih: innerHeight };
      });
      const near = (a, b) => Math.abs(a - b) <= 1;
      assert(near(r.w, c.w) && near(r.h, c.h), c.vw + 'x' + c.vh + ': stage ' + r.w + 'x' + r.h);
      assert(near(r.x, c.x) && near(r.y, c.y), c.vw + 'x' + c.vh + ': offset ' + r.x + ',' + r.y);
      assert(r.sw <= r.iw && r.sh <= r.ih, c.vw + 'x' + c.vh + ': page scrolls');
      await page.setViewportSize({ width: 1000, height: 1000 });
      await page.waitForFunction(() => Math.abs(document.getElementById('stage').getBoundingClientRect().width - 1000) <= 1, null, { timeout: 3000 });
      const r2 = await page.evaluate(() => document.getElementById('stage').getBoundingClientRect().toJSON());
      assert(near(r2.width, 1000) && Math.abs(r2.y - (1000 - 562.5) / 2) <= 1, 'refits on resize: ' + JSON.stringify(r2));
    });
  }
});

/* --------------------------------------------------------------- presenter */

test('presenter view: P opens it, sync both ways over file://, timer, checkpoints, next preview, no notes', async () => {
  await withDeck({}, async (page, context) => {
    assert(page.url().startsWith('file://'), 'running over file://');
    const [pres] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('p')]);
    await pres.waitForLoadState('load');
    assert(pres.url().startsWith('file://') && pres.url().includes('?presenter'), 'presenter url ' + pres.url());
    await pres.waitForFunction(() => document.documentElement.classList.contains('dp-connected'), null, { timeout: 5000 });
    eq(await text(pres, '.dp-slide'), 'Slide 1 / 12 · s01', 'presenter shows current slide');

    // deck -> presenter
    await page.keyboard.press('ArrowRight');
    await pres.waitForFunction(() => document.querySelector('.dp-slide').textContent === 'Slide 2 / 12 · s02');
    eq(await text(pres, '.dp-build'), 'Build 0 / 4', 'build counter');
    assert((await text(pres, '.dp-next .dp-caption')).startsWith('Next build 1 / 4'), 'next label');

    // presenter -> deck (keys, clicker key, button)
    await pres.keyboard.press('ArrowRight');
    await page.waitForFunction(() => Deck.state().step === 1);
    await pres.keyboard.press('PageDown');
    await page.waitForFunction(() => Deck.state().step === 2);
    await pres.click('.dp-btn[data-dp="next"]');
    await page.waitForFunction(() => Deck.state().step === 3);
    eq(await where(page), 's02/3', 'presenter drove the deck');
    await pres.waitForFunction(() => document.querySelector('.dp-build').textContent === 'Build 3 / 4');

    // preview panes are the deck itself, in embed mode
    const curFrame = pres.frame({ url: /embed=current/ });
    const nextFrame = pres.frame({ url: /embed=next/ });
    assert(curFrame && nextFrame, 'two preview frames');
    await curFrame.waitForFunction(() => window.Deck && Deck.mode === 'embed' && Deck.state().id === 's02' && Deck.state().step === 3);
    await nextFrame.waitForFunction(() => Deck.state().id === 's02' && Deck.state().step === 4);

    // blackout from the presenter
    await pres.keyboard.press('b');
    await page.waitForFunction(() => document.documentElement.classList.contains('deck-is-black'));
    await pres.waitForFunction(() => document.querySelector('.dp-flags').textContent.includes('BLACK'));
    await pres.keyboard.press('b');
    await page.waitForFunction(() => !document.documentElement.classList.contains('deck-is-black'));

    // jump by number from the presenter
    await typeNumber(pres, 5);
    await page.waitForFunction(() => Deck.state().id === 's04');
    await pres.keyboard.press('ArrowRight');
    await page.waitForFunction(() => Deck.state().step === 1);
    // trigger clicked inside the presenter's current pane reaches the deck
    await curFrame.waitForFunction(() => Deck.state().id === 's04' && Deck.state().step === 1);
    await curFrame.click('#s04 [data-trigger="dT"]');
    await page.waitForFunction(() => Deck.store.get('decision2.result') === 'D');
    await curFrame.waitForFunction(() => document.querySelector('#s04 [data-triggered="dT"]').classList.contains('is-triggered'));
    // the pane now has focus: clicker keys pressed there still drive the deck
    await pres.keyboard.press('PageDown');
    await page.waitForFunction(() => Deck.state().step === 2);
    await pres.keyboard.press('PageUp');
    await page.waitForFunction(() => Deck.state().step === 1);

    // talk clock: auto-started by the first advance; pause / reset from the presenter
    assert((await page.evaluate(() => Deck.clock.elapsed())) > 0, 'clock auto-started');
    await pres.click('.dp-btn[data-dp="toggle"]');
    await page.waitForFunction(() => !JSON.parse(sessionStorage.getItem('deck-live:' + location.pathname)).live.clock.since);
    await pres.waitForFunction(() => document.querySelector('.dp-btn[data-dp="toggle"]').textContent === 'Resume');
    // Reset is two-step: the first click only arms it (a stray click next to Pause must not wipe the clock)
    const before = await page.evaluate(() => Deck.clock.elapsed());
    await pres.click('.dp-btn[data-dp="reset"]');
    await pres.waitForFunction(() => document.querySelector('.dp-btn[data-dp="reset"]').textContent === 'Reset? click again');
    eq(await page.evaluate(() => Deck.clock.elapsed()), before, 'one Reset click does not reset the clock');
    await pres.click('.dp-btn[data-dp="reset"]');
    await page.waitForFunction(() => Deck.clock.elapsed() === 0);
    await pres.waitForFunction(() => document.querySelector('.dp-btn[data-dp="reset"]').textContent === 'Reset');
    await pres.waitForFunction(() => document.querySelector('.dp-elapsed').textContent === '0:00');
    await pres.click('.dp-btn[data-dp="toggle"]');
    await page.waitForFunction(() => Deck.clock.elapsed() > 0);

    // checkpoints: behind (not reached, past due), then ahead (reached early)
    await page.evaluate(() => { Deck.clock.reset(); Deck.go('s01'); });
    await page.evaluate(() => Deck.clock.set(100000)); // 1:40 > s04 due 1:30
    await pres.waitForFunction(() => document.querySelector('.dp-cp[data-slide="s04"]').dataset.state === 'behind');
    assert((await text(pres, '.dp-cp[data-slide="s04"] .dp-cp-status')).endsWith('behind'), 'behind label');
    eq(await pres.getAttribute('.dp-cp[data-slide="s06"]', 'data-state'), 'pending', 's06 still pending');
    await page.evaluate(() => { Deck.clock.reset(); Deck.clock.set(60000); Deck.go('s06'); });
    await pres.waitForFunction(() => document.querySelector('.dp-cp[data-slide="s04"]').dataset.state === 'ahead');
    assert((await text(pres, '.dp-cp[data-slide="s04"] .dp-cp-status')).includes('0:30 ahead'), 'ahead by 0:30');
    assert((await text(pres, '.dp-cp[data-slide="s06"] .dp-cp-status')).includes('2:00 ahead'), 's06 ahead by 2:00');

    // no notes anywhere
    const notes = await pres.evaluate(() => ({
      fields: document.querySelectorAll('textarea, [contenteditable], input[type="text"]').length,
      named: document.querySelectorAll('[class*="note" i], [id*="note" i]').length,
      label: /\bnotes?\b/i.test(document.querySelector('.deck-presenter').innerText),
    }));
    eq(notes, { fields: 0, named: 0, label: false }, 'presenter has no notes');
    await pres.close();
  });
});

/* ------------------------------------------------------------------- print */

test('print mode: the PDF export plan in final state, print defaults, tagged variants, page count = plan', async () => {
  await withDeck({ query: '?print' }, async (page) => {
    const r = await page.evaluate(() => {
      const vis = (n) => { const cs = getComputedStyle(n); return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && n.getClientRects().length > 0; };
      const slides = Array.from(document.querySelectorAll('#stage .slide'));
      const printed = (sel) => Array.from(document.querySelectorAll(sel)).filter((n) => !n.closest('.slide.deck-export-omit'));
      return {
        printClass: document.documentElement.classList.contains('deck-print'),
        shown: slides.filter((s) => getComputedStyle(s).display !== 'none' && s.offsetHeight === 1080).map((s) => s.id),
        omitted: slides.filter((s) => s.classList.contains('deck-export-omit')).map((s) => s.id),
        last: Array.from(document.querySelectorAll('.slide.deck-print-last')).map((s) => s.id),
        steps: printed('[data-step]').filter((n) => !vis(n)).map((n) => n.closest('.slide').id + ' ' + n.className),
        triggeredShown: Array.from(document.querySelectorAll('[data-triggered]')).filter(vis).length,
        printOnly: printed('[data-print-only]').filter(vis).length,
        printOnlyTotal: printed('[data-print-only]').length,
        hiddenInPrint: Array.from(document.querySelectorAll('[data-print="hide"]')).filter(vis).length,
        binds: Array.from(document.querySelectorAll('[data-bind]')).map((n) => n.textContent === n.getAttribute('data-print')),
        timer: document.querySelector('#clock2 [data-timer-text]').textContent,
        showIf: Array.from(document.querySelectorAll('[data-show-if]')).map((n) => n.getAttribute('data-show-if') + '=' + vis(n)),
        tags: Array.from(document.querySelectorAll('.deck-variant-tag')).filter(vis).map((t) => t.closest('.slide').id + ':' + t.textContent),
        names: Array.from(document.querySelectorAll('[data-morph]')).filter((n) => n.style.viewTransitionName).length,
      };
    });
    assert(r.printClass, 'print class set');
    eq(r.shown, PDF_PLAN, 'the PDF plan, laid out at 1080 px in plan order (main flow, then the hidden slides)');
    eq(r.omitted, ['s04z', 's07e'], 'the auto bridge and the PPTX-only end copy are left out');
    eq(r.last, ['h1'], 'no page break after the last page');
    eq(r.steps, [], 'every build visible');
    eq(r.triggeredShown, 0, 'triggered elements in their print default (hidden)');
    eq(r.printOnly, r.printOnlyTotal, 'print-only placeholders visible');
    eq(r.hiddenInPrint, 0, 'data-print="hide" elements hidden');
    assert(r.binds.length >= 5 && r.binds.every(Boolean), 'bindings show data-print values');
    eq(r.timer, '2:00', 'timer shows its print value');
    eq(r.showIf, ['decision2.result==D=false', 'decision2.result==V=false', '!decision2.result=false', 'decision2.scenario!=M=true', 'decision2.scenario==M=false'], 'show-if print defaults');
    eq(r.tags, ['s02m:Variant · chosen live', 's06m:Variant · chosen live', 'h1:Backup · hidden slide'], 'hidden slides tagged');
    eq(r.names, 0, 'morph disabled');
    const pdf = await page.pdf({ width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
    eq(countPdfPages(pdf), PDF_PLAN.length, 'PDF page count equals the plan');
  });
});

test('static export plans: PDF = clicker order + appendix, PPTX = physical order; data-export, auto bridges and unused slots', async () => {
  await withDeck({}, async (page) => {
    const r = await page.evaluate(() => ({
      pdf: Deck.exportPlan('pdf').map((x) => x.id + ':' + x.part),
      pptx: Deck.exportPlan('pptx').map((x) => x.id + (x.hidden ? '*' : '')),
      all: Deck.exportPlan('all').length,
      tags: Deck.exportPlan('pdf').filter((x) => x.tag).map((x) => x.id + ':' + x.tag),
      exp: Deck.slides.filter((x) => x.exports.join(' ') !== 'pdf pptx').map((x) => x.id + ':' + x.exports.join(' ')),
    }));
    eq(r.pdf, PDF_PLAN.map((id) => id + ':' + (['s02m', 's06m', 'h1'].includes(id) ? 'appendix' : 'main')), 'PDF plan');
    eq(r.pptx, PPTX_PLAN.map((id) => id + (['s02m', 's06m', 'h1'].includes(id) ? '*' : '')), 'PPTX plan');
    eq(r.all, SLIDE_COUNT, 'all = every slide');
    eq(r.tags, ['s02m:Variant · chosen live', 's06m:Variant · chosen live', 'h1:Backup · hidden slide'], 'appendix pages keep their tags');
    eq(r.exp, ['s04z:', 's07e:pptx'], 'Deck.slides[].exports');
  });
  await withDeck({ query: '?print&export=pptx' }, async (page) => {
    eq(await page.evaluate(() => Array.from(document.querySelectorAll('#stage > .slide')).filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.id)), PPTX_PLAN, '?print&export=pptx lays out the PPTX plan');
  });
  await withDeck({ query: '?print&export=all' }, async (page) => {
    eq(await page.evaluate(() => Array.from(document.querySelectorAll('#stage > .slide')).filter((s) => getComputedStyle(s).display !== 'none').length), SLIDE_COUNT, '?print&export=all lays out every slide');
  });
  // an unused member slot and data-export="none" (set before the engine starts)
  const init = () => document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'interactive') return;
    document.getElementById('s06m').setAttribute('data-hidden', 'unused');
    document.getElementById('s03').setAttribute('data-export', 'none');
  });
  await withDeck({ init }, async (page) => {
    const r = await page.evaluate(() => ({
      pdf: Deck.exportPlan('pdf').map((x) => x.id),
      pptx: Deck.exportPlan('pptx').map((x) => x.id),
      kind: document.getElementById('s06m').getAttribute('data-folio-hidden'),
      tag: !!document.querySelector('#s06m > .deck-variant-tag'),
      s06m: Deck.slides.find((x) => x.id === 's06m'),
    }));
    eq(r.pdf, ['s01', 's02', 's04', 's05', 's06', 's07', 's02m', 'h1'], 'unused slot and data-export="none" left out of the PDF');
    eq(r.pptx, ['s01', 's02', 's02m', 's04', 's05', 's06', 's07', 'h1', 's07e'], 'and out of the PPTX');
    eq([r.kind, r.tag, r.s06m.hidden, r.s06m.unused, r.s06m.exports], ['unused', false, true, true, []], 'unused slot: hidden, untagged, never exported');
    await page.evaluate(() => Deck.go('s06', Deck.slides.find((x) => x.id === 's06').steps));
    await settle(page);
    await page.keyboard.press('ArrowRight');
    await settle(page);
    eq(await where(page), 's07/0', 'Next skips the unused slot');
    const pos = await page.evaluate(() => Deck.slides.findIndex((x) => x.id === 's06m') + 1);
    await page.keyboard.type(String(pos));
    eq(await page.evaluate(() => document.querySelector('.deck-jump').textContent.includes('no such slide')), true, 'the jump overlay calls an unused slot no slide');
    await page.keyboard.press('Enter');
    await settle(page);
    eq(await where(page), 's07/0', 'typing an unused slot\'s number goes nowhere');
  });
});

test('Ctrl+P on the live deck prints final states (beforeprint/afterprint)', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's02', 1);
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    assert(await page.evaluate(() => document.documentElement.classList.contains('deck-print')), 'print layout on');
    assert(await visible(page, '#s02 .arrows'), 'final build shown for print');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    eq(await page.evaluate(() => document.documentElement.classList.contains('deck-print')), false, 'print layout off');
    eq(await visible(page, '#s02 .arrows'), false, 'live build state restored');
    eq(await activeIds(page), ['s02'], 'active slide restored');
  });
});

test('Ctrl+P prints the PDF plan (appendix last, bridge and end copy left out), afterprint restores the physical order', async () => {
  await withDeck({}, async (page) => {
    const order = () => page.evaluate(() => Array.from(document.querySelectorAll('#stage > .slide')).map((s) => s.id + (s.classList.contains('deck-export-omit') ? '-' : '')));
    const physical = await order();
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    eq((await order()).filter((x) => !x.endsWith('-')), PDF_PLAN, 'print order = PDF plan');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    eq(await order(), physical, 'physical order and classes restored');
    await page.keyboard.press('ArrowRight');
    eq(await where(page), 's02/0', 'navigation still follows the physical order');
  });
});

/* ------------------------------------------------------------------- tools */

function run(args) {
  return execFileSync(process.execPath, args, { cwd: DECK, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

test('tools/build.cjs: one self-contained file that runs offline with no requests', async () => {
  const dir = path.join(OUT, 'offline');
  fs.rmSync(dir, { recursive: true, force: true });
  const outFile = path.join(dir, 'demo.html');
  const log = run(['tools/build.cjs', 'slides/demo.html', outFile, '--strict']);
  assert(/2 stylesheet\(s\), 1 script\(s\), 2 asset\(s\)/.test(log), 'build log: ' + log);
  eq(fs.readdirSync(dir), ['OFL.txt', 'demo.html'], 'one output file, plus the licence of the font it embeds');
  assert(/^<!doctype html>\n<!--\n  Fonts embedded in this file, licensed under the SIL Open Font License/i.test(fs.readFileSync(path.join(dir, 'demo.html'), 'utf8')), 'licence notice after the doctype');
  const html = fs.readFileSync(outFile, 'utf8');
  assert(!/<link[^>]+stylesheet/i.test(html), 'no stylesheet links left');
  assert(!/<script[^>]+\ssrc=/i.test(html), 'no external scripts left');
  assert(html.includes('data:font/woff2;base64,'), 'fonts inlined');
  const url = pathToFileURL(outFile).href;
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const requests = [];
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u === url) return route.continue();
    requests.push(u);
    return route.abort();
  });
  const page = await context.newPage();
  watch(page, 'built');
  page.on('request', (rq) => { const u = rq.url(); if (u !== url && !u.startsWith('data:')) requests.push(u); });
  try {
    await page.goto(url);
    await page.waitForFunction(() => window.Deck && window.Deck.isReady);
    eq([...new Set(requests)], [], 'no network or file requests besides the document');
    const fonts = await page.evaluate(() => Array.from(document.fonts).filter((f) => f.family.includes('Inter Demo')).map((f) => f.status));
    eq(fonts, ['loaded', 'loaded'], 'inlined fonts load');
    await page.keyboard.press('ArrowRight');
    eq(await where(page), 's02/0', 'built deck navigates');
  } finally {
    await context.close();
  }
});

test('tools/export-pdf.cjs: one 16:9 page per slide of the PDF plan, real text, optional lossless size pass', async () => {
  const outFile = path.join(OUT, 'demo.pdf');
  fs.rmSync(outFile, { force: true });
  const log = run(['tools/export-pdf.cjs', 'slides/demo.html', outFile]);
  assert(log.includes('10 pages: 7 main + 3 appendix, of 12 slides'), 'log: ' + log);
  assert(/lossless pass|size pass skipped/.test(log), 'size pass reported: ' + log);
  const buf = fs.readFileSync(outFile);
  eq(buf.slice(0, 5).toString(), '%PDF-', 'PDF header');
  const s = pdfText(buf);
  eq(countPdfPages(buf), PDF_PLAN.length, 'page count');
  eq([...new Set(pageFill(buf))], [1], 'every page printed full size');
  const plain = path.join(OUT, 'demo-plain.pdf');
  const log2 = run(['tools/export-pdf.cjs', 'slides/demo.html', plain, '--no-shrink']);
  assert(/size pass skipped: off/.test(log2), '--no-shrink: ' + log2);
  eq(countPdfPages(fs.readFileSync(plain)), PDF_PLAN.length, '--no-shrink page count');
  assert(fs.statSync(outFile).size <= fs.statSync(plain).size, 'the size pass never grows the file');
  fs.rmSync(plain, { force: true });
  const box = s.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  assert(box && Math.abs(box[1] / box[2] - 16 / 9) < 0.01, '16:9 page, got ' + (box && box.slice(1)));
  assert(/\/Font\b/.test(s) && /\/ToUnicode\b/.test(s), 'text is embedded as fonts (vector, searchable)');
});

test('tools/export-pptx.cjs: valid zip, one slide per slide of the PPTX plan (physical order), titles, hidden flags, empty notes', async () => {
  const outFile = path.join(OUT, 'demo.pptx');
  fs.rmSync(outFile, { force: true });
  const log = run(['tools/export-pptx.cjs', 'slides/demo.html', outFile]);
  assert(log.includes('11 slides, 3 hidden, 1 left out'), 'log: ' + log);
  const N = PPTX_PLAN.length;
  const buf = fs.readFileSync(outFile);
  eq(buf.slice(0, 2).toString(), 'PK', 'zip signature');
  const JSZip = require(require.resolve('jszip', { paths: [DECK] }));
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  eq(slideFiles.length, N, 'slide parts');
  const pres = await zip.file('ppt/presentation.xml').async('string');
  eq((pres.match(/<p:sldId\b/g) || []).length, N, 'slides listed in presentation.xml');
  assert(/<p:sldSz cx="12192000" cy="6858000"/.test(pres), '16:9 widescreen size');
  const titles = [];
  const hidden = [];
  for (let i = 1; i <= N; i++) {
    const x = await zip.file('ppt/slides/slide' + i + '.xml').async('string');
    assert(/type="title"/.test(x), 'slide ' + i + ' has a title placeholder');
    titles.push((x.match(/<a:t>([^<]*)<\/a:t>/) || [])[1]);
    if (/<p:sld [^>]*show="0"/.test(x)) hidden.push(i);
    assert(/<p:pic>/.test(x) && /descr="[^"]{10,}"/.test(x), 'slide ' + i + ' has a picture with alt text');
    assert(/<a:ext cx="12192000" cy="6858000"\/>/.test(x), 'slide ' + i + ' picture is full-bleed');
    const notes = zip.file('ppt/notesSlides/notesSlide' + i + '.xml');
    if (notes) {
      const n = await notes.async('string');
      const body = n.replace(/<a:fld\b[\s\S]*?<\/a:fld>/g, '');
      const words = (body.match(/<a:t>([^<]*)<\/a:t>/g) || []).map((t) => t.replace(/<\/?a:t>/g, '')).join('').trim();
      eq(words, '', 'notes of slide ' + i + ' are empty');
    }
  }
  eq(titles[0], 'Big D or little d?', 'first slide title');
  eq(titles[9], 'Q&amp;A hub', 'hub title (XML-escaped)');
  eq(titles[10], 'So, was that a big D or a little d? (end)', 'the end copy stays in the PPTX');
  eq(hidden, [3, 8, 10], 'hidden slides stay hidden, in place');
  const media = Object.keys(zip.files).filter((f) => /^ppt\/media\/.+\.png$/.test(f));
  eq(media.length, N, 'one picture per slide');
  const png = await zip.file(media[0]).async('nodebuffer');
  eq([png.readUInt32BE(16), png.readUInt32BE(20)], [1920, 1080], 'pictures are 1920x1080');
});

/* ------------------------------------------------------------ regressions */

// Fires keydowns synchronously, inside one task, so the second one lands before the View Transition's
// update callback has run (as with a fast clicker double press on a slow machine).
const keysInOneTask = (page, keys) => page.evaluate((ks) => {
  ks.forEach((key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
}, keys);
const morphNames = (page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-morph]')).filter((n) => n.style.viewTransitionName).map((n) => n.closest('.slide').id + ':' + n.dataset.morph));
const ANIM_LOG = () => {
  window.__anims = [];
  document.addEventListener('animationstart', (e) => {
    const s = e.target.closest && e.target.closest('.slide');
    if (s && e.target !== s) window.__anims.push(s.id + ':' + e.target.className.split(' ')[0] + ':' + e.animationName);
  });
};

test('regression: Next+Prev before the transition callback ran: no entrance replay on the backward entry, no leaked morph names', async () => {
  await withDeck({ init: ANIM_LOG }, async (page) => {
    assert(await page.evaluate(() => typeof document.startViewTransition === 'function'), 'needs the View Transitions API');
    await goTo(page, 's04', 3);
    await settle(page);
    await sleep(700);
    await page.evaluate(() => window.__anims.splice(0));
    await keysInOneTask(page, ['PageDown', 'PageUp']); // -> bridge (forward, fade) and straight back to s04/3
    await sleep(700);
    eq(await where(page), 's04/3', 'back on s04 at its final build');
    eq(await activeIds(page), ['s04'], 'one active slide');
    eq(await page.evaluate(() => window.__anims.filter((a) => a.startsWith('s04:'))), [], 'the data-enter mail does not drop in again on a backward entry');
    await goTo(page, 's02', 4);
    await settle(page);
    await keysInOneTask(page, ['PageDown', 'PageUp']); // morph s02 -> s03 and straight back
    await sleep(1100);
    eq(await where(page), 's02/4', 'back on s02');
    eq(await morphNames(page), [], 'no view-transition-name left on the slide after the superseded morph');
  });
});

test('regression: Ctrl+P right after Next (transition still pending) prints every build of the new slide', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's02', 4);
    await settle(page);
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }));
      window.dispatchEvent(new Event('beforeprint'));
    });
    await sleep(400);
    const r = await page.evaluate(() => ({
      print: document.documentElement.classList.contains('deck-print'),
      unrevealed: Array.from(document.querySelectorAll('[data-step]:not(.is-revealed)')).map((n) => n.closest('.slide').id + ' ' + n.className),
      names: Array.from(document.querySelectorAll('[data-morph]')).filter((n) => n.style.viewTransitionName).length,
    }));
    eq(r, { print: true, unrevealed: [], names: 0 }, 'print layout intact');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    eq(await where(page), 's03/0', 'position kept');
    eq(await activeIds(page), ['s03'], 'live view restored on the new slide');
  });
});

test('regression: a timer revealed on entry through a View Transition is saved (reload keeps its start)', async () => {
  await withDeck({}, async (page) => {
    await goTo(page, 's04', 3); // jump to the final build: the timer starts inside the transition's callback
    await page.waitForFunction(() => Deck.timers().clock2 && Deck.timers().clock2.running);
    const start = await page.evaluate(() => Deck.timers().clock2.start);
    const saved = await page.evaluate(() => (JSON.parse(sessionStorage.getItem('deck-live:' + location.pathname)).live.timers.clock2 || {}).start);
    eq(saved, start, 'timer start written to sessionStorage');
    await sleep(1100);
    await page.reload();
    await page.waitForFunction(() => window.Deck && window.Deck.isReady);
    const t = await page.evaluate(() => Deck.timers().clock2);
    assert(t && t.start === start && t.elapsed >= 1, 'timer resumes after reload, elapsed ' + (t && t.elapsed));
  });
});

test('regression: a hotspot clicked while a transition is still running fires, and a stage click there still advances', async () => {
  await withDeck({}, async (page) => {
    await page.evaluate(() => document.documentElement.style.setProperty('--deck-fade-duration', '3000ms'));
    await goTo(page, 's06', 1);
    await settle(page);
    const box = await page.evaluate(() => {
      const s = document.getElementById('s07');
      s.classList.add('is-active');
      const b = s.querySelector('[data-trigger="dS20"]').getBoundingClientRect();
      s.classList.remove('is-active');
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    await page.keyboard.press('PageDown'); // fade into s07, 3 s long
    assert(await page.evaluate(() => document.documentElement.classList.contains('deck-vt')), 'transition running');
    await page.mouse.click(box.x, box.y);
    eq(await where(page), 's07/0', 'the click on the stamp chip did not advance');
    eq(await page.evaluate(() => Deck.store.get('close.result')), 'D', 'the trigger fired');
    await page.keyboard.press('PageUp');
    await settle(page);
    await page.keyboard.press('PageDown');
    assert(await page.evaluate(() => document.documentElement.classList.contains('deck-vt')), 'transition running again');
    await page.mouse.click(1900, 20);
    eq(await where(page), 's07/1', 'a click on the empty stage during the transition still advances');
  });
});

test('regression: double-clicking a goto hotspot jumps once, without an extra advance', async () => {
  for (const [id, step, sel, want] of [['s02', 4, '#s02 [data-goto="s02m"]', 's02m/0'], ['s07', 3, '#s07 [data-goto="h1"]', 'h1/0'], ['s06', 1, '#s06 [data-goto="s06m"]', 's06m/0']]) {
    await withDeck({}, async (page) => {
      await goTo(page, id, step);
      await settle(page);
      await page.dblclick(sel);
      await sleep(600);
      eq(await where(page), want, 'double-click on ' + sel);
    });
  }
  await withDeck({}, async (page) => {
    await goTo(page, 's02', 0);
    await settle(page);
    await page.mouse.dblclick(1900, 20);
    eq(await where(page), 's02/2', 'a double-click on the empty stage still advances twice');
  });
});

test('regression: a bad slide number typed in the presenter is reported there, not on the audience screen', async () => {
  await withDeck({}, async (page, context) => {
    const [pres] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('p')]);
    await pres.waitForLoadState('load');
    await pres.waitForFunction(() => document.documentElement.classList.contains('dp-connected'), null, { timeout: 5000 });
    await typeNumber(pres, 42);
    await pres.waitForFunction(() => document.querySelector('.deck-toast').classList.contains('is-on'));
    eq(await text(pres, '.deck-toast'), 'No slide 42', 'presenter shows the toast');
    await sleep(300);
    eq(await page.evaluate(() => document.querySelector('.deck-toast').classList.contains('is-on')), false, 'no toast on the audience screen');
    eq(await where(page), 's01/0', 'deck did not move');
    await typeNumber(pres, 4);
    await page.waitForFunction(() => Deck.state().id === 's03');
    await pres.close();
  });
});

test('regression: visiting a backup slide does not mark checkpoints as reached', async () => {
  await withDeck({}, async (page) => {
    await page.keyboard.press('ArrowRight');
    await page.evaluate(() => Deck.clock.set(30000));
    await typeNumber(page, 11);
    eq(await where(page), 'h1/0', 'on the Q&A hub (data-hidden="backup")');
    eq(await page.evaluate(() => Deck.clock.reached()), {}, 'no checkpoint reached by the hub visit');
    await page.click('#h1 [data-goto="@back"]');
    await goTo(page, 's04', 0);
    eq(Object.keys(await page.evaluate(() => Deck.clock.reached())), ['s04'], 'reaching s04 still marks it');
  });
});

test('regression: tools/build.cjs --strict accepts quoted SVG data URIs with url(%23id) fragments (as in the design directions)', async () => {
  const dir = path.join(OUT, 'dataurl');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  fs.copyFileSync(path.join(DECK, 'slides', 'fonts', 'inter-regular-subset.woff2'), path.join(dir, 'fonts', 'f.woff2'));
  const svg = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='9'><filter id='n'><feTurbulence/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
  const css = '@font-face{font-family:F;src:url("fonts/f.woff2") format("woff2")} .a{background-image:' + svg + '} .b{fill:url(#g)} .c{background:url( \'fonts/f.woff2\' )}';
  fs.writeFileSync(path.join(dir, 'in.html'), '<!doctype html><html><head><style>' + css + '</style></head><body><div class="a" style="background:' + svg.replace(/"/g, '&quot;') + '"></div></body></html>');
  const outFile = path.join(dir, 'out.html');
  const log = run(['tools/build.cjs', path.join(dir, 'in.html'), outFile, '--strict']);
  assert(!/WARNING/.test(log), 'no warnings: ' + log);
  assert(/2 asset\(s\) inlined/.test(log), 'both font references inlined: ' + log);
  const html = fs.readFileSync(outFile, 'utf8');
  assert(html.includes(svg), 'the SVG data URI is left byte-for-byte intact');
  assert(html.includes('fill:url(#g)'), 'fragment reference kept');
  const designs = path.join(DECK, '..', 'design', 'directions');
  if (fs.existsSync(designs)) {
    for (const d of fs.readdirSync(designs).filter((n) => fs.existsSync(path.join(designs, n, 'index.html')))) {
      const l = run(['tools/build.cjs', path.join(designs, d, 'index.html'), path.join(dir, d + '.html'), '--strict']);
      assert(!/WARNING/.test(l), 'design ' + d + ' builds cleanly: ' + l);
    }
  }
});

test('regression: lit-room mode: key L toggles a root class, persists across reload and Shift+R, listed in help, ?lit forces it', async () => {
  await withDeck({}, async (page) => {
    const lit = () => page.evaluate(() => document.documentElement.classList.contains('deck-lit'));
    eq(await lit(), false, 'off by default');
    await page.keyboard.press('l');
    eq(await lit(), true, 'L turns it on');
    eq(await page.evaluate(() => [Deck.isLit, Deck.state().lit]), [true, true], 'API reports it');
    eq(await where(page), 's01/0', 'L does not navigate');
    await page.reload();
    await page.waitForFunction(() => window.Deck && window.Deck.isReady);
    eq(await lit(), true, 'persisted across a reload');
    await page.keyboard.press('Shift+R');
    eq(await lit(), true, 'Shift+R keeps the room condition');
    await page.keyboard.press('Shift+L');
    eq(await lit(), false, 'Shift+L also toggles');
    await page.evaluate(() => Deck.lit(true));
    eq(await lit(), true, 'Deck.lit(true)');
    await page.evaluate(() => Deck.lit(false));
    eq(await lit(), false, 'Deck.lit(false)');
    await page.keyboard.press('?');
    const help = await page.evaluate(() => document.querySelector('.deck-help-card').innerText);
    assert(/\bL\b/.test(help) && /lit-room/i.test(help), 'help overlay lists L: ' + help);
    await page.keyboard.press('Escape');
  });
  await withDeck({ query: '?lit' }, async (page) => {
    eq(await page.evaluate(() => document.documentElement.classList.contains('deck-lit')), true, '?lit forces it on');
  });
});

test('regression: lit-room mode syncs to the presenter window and its panes; L and the button in the presenter drive the deck', async () => {
  await withDeck({}, async (page, context) => {
    const [pres] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('p')]);
    await pres.waitForLoadState('load');
    await pres.waitForFunction(() => document.documentElement.classList.contains('dp-connected'), null, { timeout: 5000 });
    await page.keyboard.press('l');
    await pres.waitForFunction(() => document.querySelector('.dp-flags').textContent.includes('LIT'));
    const curFrame = pres.frame({ url: /embed=current/ });
    const nextFrame = pres.frame({ url: /embed=next/ });
    await curFrame.waitForFunction(() => document.documentElement.classList.contains('deck-lit'));
    await nextFrame.waitForFunction(() => document.documentElement.classList.contains('deck-lit'));
    await pres.keyboard.press('l');
    await page.waitForFunction(() => !document.documentElement.classList.contains('deck-lit'));
    await curFrame.waitForFunction(() => !document.documentElement.classList.contains('deck-lit'));
    await pres.click('.dp-btn[data-dp="lit"]');
    await page.waitForFunction(() => document.documentElement.classList.contains('deck-lit'));
    await pres.waitForFunction(() => document.querySelector('.dp-flags').textContent.includes('LIT'));
    await pres.close();
  });
});

test('regression: folio hook: visible slides numbered, hidden ones unnumbered and tagged, a bridge repeats its predecessor, data-folio-text filled and padded', async () => {
  const expectFolios = ['s01:1', 's02:2', 's02m:', 's03:3', 's04:4', 's04z:4', 's05:5', 's06:6', 's06m:', 's07:7', 'h1:', 's07e:8'];
  await withDeck({}, async (page) => {
    const r = await page.evaluate(() => ({
      folios: Array.from(document.querySelectorAll('#stage .slide')).map((s) => s.id + ':' + s.getAttribute('data-folio')),
      hiddenKinds: Array.from(document.querySelectorAll('#stage .slide[data-folio-hidden]')).map((s) => s.id + ':' + s.getAttribute('data-folio-hidden')),
      total: document.getElementById('stage').getAttribute('data-folio-total'),
      api: Deck.slides.map((s) => s.folio),
      s02: document.querySelector('#s02 [data-folio-text]').textContent,
      s02m: document.querySelector('#s02m [data-folio-text]').textContent,
    }));
    eq(r.folios, expectFolios, 'data-folio per slide');
    eq(r.hiddenKinds, ['s02m:variant', 's06m:variant', 'h1:backup'], 'hidden slides tagged');
    eq(r.total, '8', 'visible total (the auto bridge s04z is not counted)');
    eq(r.api, expectFolios.map((f) => f.split(':')[1]), 'Deck.slides[].folio');
    eq(r.s02, '02', 'folio text, zero-padded to 2');
    eq(r.s02m, '', 'a hidden slide shows no number');
    await goTo(page, 's03');
    eq(await page.evaluate(() => Deck.state().folio), '3', 'state().folio');
  });
  await withDeck({ query: '?print' }, async (page) => {
    const r = await page.evaluate(() => ({
      folio: document.getElementById('s07e').getAttribute('data-folio'),
      tags: Array.from(document.querySelectorAll('.slide[data-folio-hidden] > .deck-variant-tag')).filter((t) => getComputedStyle(t).display !== 'none').length,
    }));
    eq(r, { folio: '8', tags: 3 }, 'print keeps folios and tags every hidden slide');
  });
});

test('regression: data-morph-same marks incoming morph partners whose text is unchanged, only during the transition', async () => {
  await withDeck({ init: VT_SPY }, async (page) => {
    await page.keyboard.press('ArrowRight'); // s01 -> s02: crumb, title and tiles all change
    await settle(page);
    let vt = await page.evaluate(() => window.__vt);
    eq(vt.same[0], [], 'nothing unchanged on s01 -> s02');
    await page.evaluate(() => Deck.go('s02', Deck.slides.find((x) => x.id === 's02').steps));
    await settle(page);
    await page.keyboard.press('ArrowRight'); // s02 -> s03: the parked sliver keeps its words, the crumb changes
    await settle(page);
    vt = await page.evaluate(() => window.__vt);
    const same = vt.same[vt.same.length - 1];
    assert(same.includes('s03:clockTD'), 'unchanged sliver marked: ' + same);
    assert(!same.includes('s03:crumb') && !same.includes('s03:title'), 'changed words not marked: ' + same);
    eq(await page.evaluate(() => document.querySelectorAll('[data-morph-same]').length), 0, 'marks cleared after the transition');
  });
});

test('regression: ?noauto holds an auto-advance bridge (screenshots), the default still advances', async () => {
  await withDeck({ query: '?noauto', hash: '#s04z' }, async (page) => {
    await page.waitForTimeout(900);
    eq(await where(page), 's04z/0', 'bridge held with ?noauto');
  });
  await withDeck({ hash: '#s04z' }, async (page) => {
    await page.waitForFunction(() => Deck.state().id !== 's04z', null, { timeout: 5000 });
  });
});

test('regression: paper print variant: ?print&paper sets deck-paper (dark stays default); export-pdf --paper', async () => {
  await withDeck({ query: '?print&paper' }, async (page) => {
    eq(await page.evaluate(() => ['deck-print', 'deck-paper'].map((c) => document.documentElement.classList.contains(c))), [true, true], 'paper print classes');
    eq(await page.evaluate(() => Deck.paper), true, 'Deck.paper');
  });
  await withDeck({ query: '?print' }, async (page) => {
    eq(await page.evaluate(() => document.documentElement.classList.contains('deck-paper')), false, 'dark print is the default');
  });
  const outFile = path.join(OUT, 'demo-paper.pdf');
  fs.rmSync(outFile, { force: true });
  const log = run(['tools/export-pdf.cjs', 'slides/demo.html', outFile, '--paper']);
  assert(/paper variant/.test(log) && /10 pages: 7 main \+ 3 appendix, of 12 slides/.test(log), 'export log: ' + log);
  assert(fs.statSync(outFile).size > 10000, 'paper PDF written');
});

/* ------------------------------------------------------- deck source tools */

test('tools/assemble.cjs: the Noir deck in manifest order (41 slides), private --out copies, --out kept inside slides/, team size, team options, export overrides', async () => {
  const out = path.join(DECK, 'slides', '.tmp-test-assemble.html');
  fs.rmSync(out, { force: true });
  const log = run(['tools/assemble.cjs', '--out', out]);
  assert(/41 slides from 8 groups/.test(log), 'assemble log: ' + log);
  const man = JSON.parse(fs.readFileSync(path.join(DECK, 'slides', 'src', 'manifest.json'), 'utf8'));
  const html = fs.readFileSync(out, 'utf8');
  const ids = Array.from(html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)).map((m) => m[1]);
  eq(ids, man.order, 'sections in manifest order');
  assert(!/<!--@axis/.test(html) && /class="dax dax--title/.test(html), 'axis directive expanded');
  let refused = false;
  try { run(['tools/assemble.cjs', '--out', path.join(OUT, 'outside.html')]); } catch (e) { refused = /must be a file directly in deck\/slides/.test(String(e.stderr)); }
  assert(refused, '--out outside slides/ is refused');
  await withDeck({ url: pathToFileURL(out).href }, async (page) => {
    const r = await page.evaluate(() => ({ n: Deck.slides.length, s04z: Deck.slides.find((x) => x.id === 's04z'), folio: document.getElementById('s05').getAttribute('data-folio') }));
    eq(r.n, 41, 'engine sees 41 slides');
    eq([r.s04z.auto, r.s04z.transition], [150, 'fade'], 'S04z is an auto bridge with a fade');
    eq(r.folio, '6', 'S05 folio (S02M hidden, S04z bridge not counted)');
  });
  // static export membership from the manifest
  assert(/<section\b[^>]*\bid="s20e"[^>]*\bdata-export="pptx"/.test(html), 'manifest "export": S20E is PPTX-only');
  // team size: ONE number (manifest "presenters", --presenters overrides it)
  const sec17b = (h) => (h.match(/<section\b[^>]*\bid="s17b"[^>]*>/) || [''])[0];
  const team = (h) => ({
    root: (h.match(/<html\b[^>]*>/) || [''])[0].replace(/\s+lang="en"/, ''),
    member3: (h.replace(/<!--[\s\S]*?-->/g, '').match(/\sdata-member="3"/g) || []).length,
    unused: /data-hidden="unused"/.test(sec17b(h)),
    names: (h.match(/\[MEMBER \d\]<\/span>/g) || []).length,
  });
  const variants = {};
  for (const n of [2, 3]) {
    const f = path.join(DECK, 'slides', '.tmp-test-team' + n + '.html');
    const lg = run(['tools/assemble.cjs', '--presenters', String(n), '--out', f]);
    assert(lg.includes(n + ' presenters'), 'assemble --presenters ' + n + ': ' + lg);
    variants[n] = team(fs.readFileSync(f, 'utf8'));
    fs.rmSync(f, { force: true });
  }
  const optsAttr = ' data-options="' + (man.options && man.options.nemawashi ? 'nemawashi' : '') + '"';
  eq(variants[2], { root: '<html class="team-2" data-presenters="2"' + optsAttr + '>', member3: 1, unused: true, names: 2 }, 'two presenters: member-3 elements gone, S17B an unused slot');
  eq(variants[3].root, '<html class="team-3" data-presenters="3"' + optsAttr + '>', 'three presenters: root');
  assert(variants[3].member3 >= 10 && !variants[3].unused && variants[3].names === 3, 'three presenters: member-3 elements kept, S17B in the flow: ' + JSON.stringify(variants[3]));
  eq(team(html).root, '<html class="team-' + man.presenters + '" data-presenters="' + man.presenters + '"' + optsAttr + '>', 'default build = manifest "presenters"');
  let badTeam = false;
  try { run(['tools/assemble.cjs', '--presenters', '4', '--out', out]); } catch (e) { badTeam = /presenters must be a whole number from 2 to 3/.test(String(e.stderr)); }
  assert(badTeam, '--presenters 4 is refused');
  // team options: manifest "options" (nemawashi off by default), --option name=on|off for one build
  const nema = (h) => (h.replace(/<!--[\s\S]*?-->/g, '').match(/\sdata-option="nemawashi"/g) || []).length;
  eq([nema(html), (html.match(/<html\b[^>]*\sdata-options="([^"]*)"/) || [])[1]], [man.options.nemawashi ? 2 : 0, man.options.nemawashi ? 'nemawashi' : ''], 'default build follows manifest "options"');
  const fo = path.join(DECK, 'slides', '.tmp-test-option.html');
  assert(run(['tools/assemble.cjs', '--option', 'nemawashi=on', '--out', fo]).includes('options: nemawashi'), '--option nemawashi=on is logged');
  const ho = fs.readFileSync(fo, 'utf8');
  eq([nema(ho), /data-options="nemawashi"/.test(ho)], [2, true], '--option nemawashi=on keeps the S11D chip and card');
  run(['tools/assemble.cjs', '--option', 'nemawashi=off', '--out', fo]);
  eq(nema(fs.readFileSync(fo, 'utf8')), 0, '--option nemawashi=off leaves them out');
  fs.rmSync(fo, { force: true });
  let badOpt = false;
  try { run(['tools/assemble.cjs', '--option', 'nosuch=on', '--out', out]); } catch (e) { badOpt = /no such option/.test(String(e.stderr)); }
  assert(badOpt, 'an unknown --option is refused');
  fs.rmSync(out, { force: true });
});

test('tools/check-deck.cjs: flags planted defects (min size, font fallback, overlap, overflow, bounds, builds, goto) and passes a clean slide', async () => {
  const fx = path.join(DECK, 'slides', '.tmp-test-check.html');
  const steps = [1, 2, 3, 4, 5, 6, 7].map((n) => '<p class="label at" data-step="' + n + '" style="--x:' + (72 + n * 120) + 'px;--y:900px">' + n + '</p>').join('');
  fs.writeFileSync(fx, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>fixture</title>' +
    '<link rel="stylesheet" href="../engine/deck.css"><link rel="stylesheet" href="src/theme/theme.css">' +
    '<script src="../engine/deck.js" defer></script></head><body><div id="stage">' +
    '<section class="slide daylight" id="ok"><div class="body"><h2 class="hl">A clean slide.</h2><p class="text">Nothing wrong here.</p></div></section>' +
    '<section class="slide daylight" id="bad"><div class="body">' +
    '<p class="text" style="font-size:20px">Too small</p>' +
    '<p class="text">Arrow → typed</p></div>' +
    '<p class="text at" style="--x:600px;--y:400px">Overlapping words here</p><p class="text at" style="--x:610px;--y:405px">Another line on top</p>' +
    '<div class="card at" style="--x:1200px;--y:300px;--w:300px;height:60px;overflow:hidden"><p class="text">This card clips its text because it has a fixed height</p></div>' +
    '<p class="text at" style="--x:-200px;--y:700px">Off the left edge</p>' + steps +
    '<button class="hot at" style="--x:1500px;--y:800px" data-goto="nowhere">x</button></section>' +
    '</div></body></html>');
  let out = '';
  let code = 0;
  try { out = run(['tools/check-deck.cjs', '--deck', fx, '--no-pdf']); } catch (e) { out = String(e.stdout) + String(e.stderr); code = e.status; }
  eq(code, 1, 'exit code 1 on errors');
  const has = (re, what) => assert(re.test(out), 'reports ' + what + ':\n' + out);
  has(/bad\s+ERROR min-size\s+text at 20\.0 px/, 'min size');
  has(/bad\s+ERROR fonts .*"→" U\+2192/, 'the fallback glyph');
  has(/bad\s+ERROR overlap/, 'overlap');
  has(/bad\s+ERROR overflow\s+text is clipped/, 'clipped text');
  has(/bad\s+ERROR bounds/, 'out of stage');
  has(/bad\s+ERROR builds\s+7 click builds/, 'more than 6 builds');
  has(/bad\s+ERROR goto\s+data-goto target "nowhere"/, 'bad goto');
  assert(!/\bok\s+(ERROR|WARN)/.test(out), 'the clean slide passes:\n' + out);
  fs.rmSync(fx, { force: true });
});

test('tools/shoot.cjs: build states, print/paper/lit/beamer, a fired trigger and mid-morph frames S04b -> S04z -> S05', async () => {
  const deckFile = path.join(DECK, 'slides', '.tmp-test-shoot.html');
  run(['tools/assemble.cjs', '--out', deckFile]);
  const dir = path.join(OUT, 'shoot');
  fs.rmSync(dir, { recursive: true, force: true });
  run(['tools/shoot.cjs', '--deck', deckFile, '--slides', 's04b', '--fire', 's04b:vT', '--morph', 's04b:s05', '--at', '45', '--out', dir]);
  const files = fs.readdirSync(dir).sort();
  ['s04b-b0.png', 's04b-b1.png', 's04b-b2.png', 's04b-final.png', 's04b-print.png', 's04b-paper.png', 's04b-lit.png', 's04b-beamer.png', 's04b-fire-vT.png',
    'morph-s04b-s04z-45.png', 'morph-s04z-s05-45.png', 'morph-s04b-s05-landed.png'].forEach((f) => assert(files.includes(f), 'missing ' + f + ' in ' + files.join(' ')));
  const a = fs.readFileSync(path.join(dir, 'morph-s04z-s05-45.png'));
  const b = fs.readFileSync(path.join(dir, 'morph-s04b-s05-landed.png'));
  assert(!a.equals(b), 'a mid-morph frame differs from the landed state');
  fs.rmSync(deckFile, { force: true });
});

test('zero console errors across every page, popup and frame above', async () => {
  eq(consoleErrors, [], 'console errors');
});

/* ------------------------------------------------------------------ runner */

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  browser = await chromium.launch();
  let passed = 0;
  let failed = 0;
  const selected = tests.filter((t) => !FILTER || t.name.toLowerCase().includes(FILTER.toLowerCase()) || t.name.startsWith('zero console'));
  const t0 = Date.now();
  for (const t of selected) {
    const s = Date.now();
    try {
      await t.fn();
      passed += 1;
      console.log('  ok   ' + t.name + ' (' + (Date.now() - s) + ' ms)');
    } catch (e) {
      failed += 1;
      console.log('  FAIL ' + t.name + '\n       ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n       '));
    }
  }
  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed, ' + selected.length + ' total (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
