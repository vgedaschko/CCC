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
    eq(await where(page), 's02/4', 'prev from a jumped-to slide returns where it came from (final state)');
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
  window.__vt = { calls: 0, old: [], fresh: [] };
  if (!orig) return;
  Document.prototype.startViewTransition = function (arg) {
    const cb = typeof arg === 'function' ? arg : arg && arg.update;
    window.__vt.calls += 1;
    window.__vt.old.push(Array.from(document.querySelectorAll('[data-morph]')).map((n) => n.style.viewTransitionName).filter(Boolean));
    const wrapped = () => {
      const r = cb ? cb() : undefined;
      window.__vt.fresh.push(Array.from(document.querySelectorAll('[data-morph]')).map((n) => n.style.viewTransitionName).filter(Boolean));
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
    await pres.click('.dp-btn[data-dp="reset"]');
    await page.waitForFunction(() => Deck.clock.elapsed() === 0);
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

test('print mode: every slide in final state, print defaults, tagged variants, page count = slide count', async () => {
  await withDeck({ query: '?print' }, async (page) => {
    const r = await page.evaluate(() => {
      const vis = (n) => { const cs = getComputedStyle(n); return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && n.getClientRects().length > 0; };
      const slides = Array.from(document.querySelectorAll('#stage .slide'));
      return {
        printClass: document.documentElement.classList.contains('deck-print'),
        shown: slides.filter((s) => getComputedStyle(s).display !== 'none' && s.offsetHeight === 1080).length,
        steps: Array.from(document.querySelectorAll('[data-step]')).filter((n) => !vis(n)).map((n) => n.closest('.slide').id + ' ' + n.className),
        triggeredShown: Array.from(document.querySelectorAll('[data-triggered]')).filter(vis).length,
        printOnly: Array.from(document.querySelectorAll('[data-print-only]')).filter(vis).length,
        printOnlyTotal: document.querySelectorAll('[data-print-only]').length,
        hiddenInPrint: Array.from(document.querySelectorAll('[data-print="hide"]')).filter(vis).length,
        binds: Array.from(document.querySelectorAll('[data-bind]')).map((n) => n.textContent === n.getAttribute('data-print')),
        timer: document.querySelector('#clock2 [data-timer-text]').textContent,
        showIf: Array.from(document.querySelectorAll('[data-show-if]')).map((n) => n.getAttribute('data-show-if') + '=' + vis(n)),
        tags: Array.from(document.querySelectorAll('.deck-variant-tag')).filter(vis).map((t) => t.closest('.slide').id + ':' + t.textContent),
        names: Array.from(document.querySelectorAll('[data-morph]')).filter((n) => n.style.viewTransitionName).length,
      };
    });
    assert(r.printClass, 'print class set');
    eq(r.shown, SLIDE_COUNT, 'all slides laid out at 1080 px');
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
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
    eq(pages, SLIDE_COUNT, 'PDF page count equals slide count');
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
  eq(fs.readdirSync(dir), ['demo.html'], 'single output file');
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

test('tools/export-pdf.cjs: PDF exists with one 16:9 page per slide and real text', async () => {
  const outFile = path.join(OUT, 'demo.pdf');
  fs.rmSync(outFile, { force: true });
  const log = run(['tools/export-pdf.cjs', 'slides/demo.html', outFile]);
  assert(log.includes('12 pages for 12 slides'), 'log: ' + log);
  const buf = fs.readFileSync(outFile);
  eq(buf.slice(0, 5).toString(), '%PDF-', 'PDF header');
  const s = buf.toString('latin1');
  eq((s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length, SLIDE_COUNT, 'page count');
  const box = s.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  assert(box && Math.abs(box[1] / box[2] - 16 / 9) < 0.01, '16:9 page, got ' + (box && box.slice(1)));
  assert(/\/Font\b/.test(s) && /\/ToUnicode\b/.test(s), 'text is embedded as fonts (vector, searchable)');
});

test('tools/export-pptx.cjs: valid zip, one slide per physical slide, titles, hidden flags, empty notes', async () => {
  const outFile = path.join(OUT, 'demo.pptx');
  fs.rmSync(outFile, { force: true });
  const log = run(['tools/export-pptx.cjs', 'slides/demo.html', outFile]);
  assert(log.includes('12 slides, 3 hidden'), 'log: ' + log);
  const buf = fs.readFileSync(outFile);
  eq(buf.slice(0, 2).toString(), 'PK', 'zip signature');
  const JSZip = require(require.resolve('jszip', { paths: [DECK] }));
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  eq(slideFiles.length, SLIDE_COUNT, 'slide parts');
  const pres = await zip.file('ppt/presentation.xml').async('string');
  eq((pres.match(/<p:sldId\b/g) || []).length, SLIDE_COUNT, 'slides listed in presentation.xml');
  assert(/<p:sldSz cx="12192000" cy="6858000"/.test(pres), '16:9 widescreen size');
  const titles = [];
  const hidden = [];
  for (let i = 1; i <= SLIDE_COUNT; i++) {
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
  eq(titles[10], 'Q&amp;A hub', 'hub title (XML-escaped)');
  eq(hidden, [3, 9, 11], 'hidden slides stay hidden');
  const media = Object.keys(zip.files).filter((f) => /^ppt\/media\/.+\.png$/.test(f));
  eq(media.length, SLIDE_COUNT, 'one picture per slide');
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
