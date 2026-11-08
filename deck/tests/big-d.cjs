#!/usr/bin/env node
/*
 * big-d.cjs: end-to-end checks of THE deck (slides/big-d.html, assembled from slides/src) as it is presented.
 *
 *   node tests/big-d.cjs                 run everything (also: npm run test:deck; npm test runs both suites)
 *   node tests/big-d.cjs hub             run only tests whose name contains "hub"
 *   node tests/big-d.cjs --deck <file>   another assembled copy (e.g. slides/.tmp-int.html or dist/big-d.html)
 *
 * Covers: a full clicker run-through s01 -> s20e counting presses (two presenters: s17b an unused slot), the
 * visible order, Prev as the README documents it, both S02 paths, all four S04b trigger outcomes (state, cover,
 * stopped timer, elapsed time bound on S05 and read again on S13 / S14a / S14m / S20), the goto chips and their
 * printed numbers, the Q&A hub and every backup, the presenter checkpoints, the team size (two presenters: no
 * member-3 element anywhere, the S18 bracket spans the two; three: P3 everywhere, S17B in the flow; Part II morph
 * keys match on every seam), the static exports (PDF: main flow in clicker order + tagged appendix, S04z / S20E /
 * the unused slot left out; PPTX plan in physical order), live outcomes as dashed outlines in print, lit-room mode,
 * a run through every real View Transition, and zero console errors. Uses the globally installed Playwright.
 * The team size is read from the deck (<html data-presenters>): npm test runs the suite on the default build
 * and on a three-presenter build (slides/.tmp-team3.html). Exit code 1 on any failure.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const { pageFill } = require('../tools/export-pdf.cjs');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const deckArg = args.indexOf('--deck');
const DECK = path.resolve(ROOT, deckArg >= 0 ? args[deckArg + 1] : 'slides/big-d.html');
const FILTER = args.filter((a, i) => !a.startsWith('--') && (deckArg < 0 || i !== deckArg + 1))[0] || '';
const URL0 = pathToFileURL(DECK).href;
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'slides', 'src', 'manifest.json'), 'utf8'));
const ORDER = MANIFEST.order;                          // the 41 physical positions
// two presenters (manifest default): S17b is an unused slot (hidden, not exported). With three presenters
// (assemble --presenters 3) it is in the flow; the suite reads the team size from <html data-presenters>.
let THREE = false;
let HIDDEN = ['s02m', 's14m', 's17b', 'h1', 'h2', 'h3', 'h4', 'h5'];
// what a clicker shows, the S04z bridge included (it auto-advances)
let VISIBLE = ORDER.filter((id) => !HIDDEN.includes(id));
const CHECKPOINTS = [['s05', '7:30'], ['s09a', '14:45'], ['s12a', '19:30'], ['s15', '25:00']];
// static exports: the hidden variants and backups form the PDF appendix, in physical order
const APPENDIX = ['s02m', 's14m', 'h1', 'h2', 'h3', 'h4', 'h5'];
const TAG = { s02m: 'Variant · chosen live', s14m: 'Variant · chosen live', h1: 'Backup · hidden slide', h2: 'Backup · hidden slide', h3: 'Backup · hidden slide', h4: 'Backup · hidden slide', h5: 'Backup · hidden slide' };

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
function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push('[' + label + '] ' + m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('[' + label + '] uncaught: ' + e.message));
}
async function open(o = {}) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: o.motion ? 'no-preference' : 'reduce' });
  context.on('page', (p) => watch(p, 'popup'));
  const page = await context.newPage();
  watch(page, o.label || 'deck');
  if (o.clock) await page.clock.install();
  await page.goto(URL0 + (o.query || '') + (o.hash || ''));
  if (o.clock) await page.clock.resume();
  await page.waitForFunction(() => window.Deck && window.Deck.isReady, null, { timeout: 30000 });
  return { context, page };
}
async function withDeck(o, fn) {
  const { context, page } = await open(o);
  try { await fn(page, context); } finally { await context.close(); }
}
const where = (page) => page.evaluate(() => { const s = Deck.state(); return s.id + '/' + s.step; });
const settle = (page) => page.waitForFunction(() => !document.documentElement.classList.contains('deck-vt') && !document.querySelector('.slide.deck-leaving'), null, { timeout: 10000 });
// after a press: let a transition finish and an auto bridge (S04z) move on
async function rest(page) {
  await settle(page);
  for (let i = 0; i < 40; i++) {
    const auto = await page.evaluate(() => { const m = Deck.slides[Deck.state().index]; return m.auto != null; });
    if (!auto) return;
    await page.waitForTimeout(100);
    await settle(page);
  }
  throw new Error('stuck on an auto bridge');
}
async function press(page, key) { await page.keyboard.press(key); await rest(page); }
async function typeNumber(page, n) {
  for (const ch of String(n)) await page.keyboard.press(ch);
  await page.keyboard.press('Enter');
  await rest(page);
}
async function click(page, sel) {
  await page.locator(sel).click();
  await rest(page);
}
const pos = (id) => ORDER.indexOf(id) + 1;
const stepsOf = (page, id) => page.evaluate((i) => Deck.slides.find((s) => s.id === i).steps, id);
async function finalOf(page, id) { await page.evaluate(([i, s]) => Deck.go(i, s), [id, await stepsOf(page, id)]); await rest(page); }
const isOn = (page, sel) => page.evaluate((q) => {
  const n = document.querySelector(q);
  if (!n) return null;
  const cs = getComputedStyle(n);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && n.getClientRects().length > 0;
}, sel);

/* ===================================================================== structure */

test('the assembled deck: 41 physical positions in manifest order, hidden flags, transitions into hidden variants', async () => {
  await withDeck({}, async (page) => {
    const s = await page.evaluate(() => Deck.slides);
    eq(s.map((x) => x.id), ORDER, 'manifest order');
    eq(s.filter((x) => x.hidden).map((x) => x.id), HIDDEN, 'hidden slides (' + (THREE ? 'three presenters: s17b shown' : 'two presenters: s17b an unused slot') + ')');
    eq(s.filter((x) => x.unused).map((x) => x.id), THREE ? [] : ['s17b'], 'unused member slot');
    eq(s.filter((x) => x.auto != null).map((x) => x.id), ['s04z'], 'one auto bridge');
    eq(s.filter((x) => x.exports.join(' ') !== 'pdf pptx').map((x) => x.id + ':' + x.exports.join(' ')),
      ['s04z:'].concat(THREE ? [] : ['s17b:'], ['s20e:pptx']), 'static export membership (bridge, unused slot: none; S20E: PPTX only)');
    eq(s.filter((x) => x.next).map((x) => x.id + '>' + x.next), ['s02m>s03', 's14m>s14b'], 'variants rejoin the main line');
    eq(await page.evaluate(() => document.querySelectorAll('[data-stub], .stub-mark, .stub-body').length), 0, 'no stub left');
    const max = Math.max(...s.map((x) => x.steps));
    assert(max <= 6, 'at most 6 clicks per slide, got ' + max);
    eq([pos('s02m'), pos('s13'), pos('s14m'), pos('s15'), pos('s20'), pos('h1'), pos('h2'), pos('h5'), pos('s20e')], [3, 24, 26, 29, 35, 36, 37, 40, 41], 'jump numbers');
    // team options (manifest "options", assemble --option): the S11D nemawashi chip and card exist only when switched on
    const opt = await page.evaluate(() => ({
      on: (document.documentElement.getAttribute('data-options') || '').split(/\s+/).filter(Boolean),
      nema: document.querySelectorAll('#s11d [data-trigger="nema"], #s11d [data-triggered~="nema"]').length,
      stray: document.querySelectorAll('[data-option]').length,
    }));
    eq(opt.nema, opt.on.includes('nemawashi') ? 2 : 0, 'nemawashi chip + card follow the option (' + (opt.on.includes('nemawashi') ? 'on' : 'off') + ')');
    if (opt.on.includes('nemawashi')) eq(await page.evaluate(() => document.querySelector('#s11d [data-trigger="nema"]').getAttribute('data-step')), '2', 'the chip arrives with the nemawashi block');
    // placeholder positions: data-positions="tbd" (dashed markers) may stay only while the slide still has placeholders
    const tbd = await page.evaluate(() => Array.from(document.querySelectorAll('.slide[data-positions="tbd"]')).map((sl) => [sl.id, sl.querySelectorAll('.ph').length]));
    tbd.forEach(([id, n]) => assert(n > 0, id + ': every placeholder is filled but data-positions="tbd" is still set: fill in the positions (06-g6-part2.css) and delete it'));
  });
});

/* ===================================================================== clicker */

test('clicker run-through s01 -> s20e: visible order, press count, the end stays on s20e', async () => {
  await withDeck({ hash: '#s01' }, async (page) => {
    const slides = await page.evaluate(() => Deck.slides);
    const expectPresses = VISIBLE.filter((id) => id !== 's20e').reduce((n, id) => {
      const m = slides.find((x) => x.id === id);
      return n + (m.auto != null ? 0 : m.steps + 1); // each build, then one press to leave; the bridge leaves by itself
    }, 0);
    const seen = ['s01'];
    let presses = 0;
    while ((await page.evaluate(() => Deck.state().id)) !== 's20e' && presses < 400) {
      await press(page, 'PageDown');
      presses += 1;
      const id = await page.evaluate(() => Deck.state().id);
      if (seen[seen.length - 1] !== id) seen.push(id);
    }
    // the bridge is passed through, not stopped on
    eq(seen, VISIBLE.filter((id) => id !== 's04z'), 'visible order');
    eq(presses, expectPresses, 'clicker presses from s01/0 to s20e/0');
    eq(await where(page), 's20e/0', 'lands on the end copy');
    await press(page, 'PageDown');
    eq(await where(page), 's20e/0', 'Next at the very end stays on s20e');
    eq(await page.evaluate(() => Deck.state().folio), String(VISIBLE.filter((id) => id !== 's04z').length), 'last folio = visible count');
  });
});

test('Prev as documented: back through builds, previous visible slide in its final state, skips the S04z bridge, returns from a jump at the build it left', async () => {
  await withDeck({ hash: '#s05' }, async (page) => {
    await press(page, 'PageUp');
    eq(await where(page), 's04b/' + await stepsOf(page, 's04b'), 'Prev from s05/0 skips the auto bridge to S04b final');
    await page.evaluate(() => Deck.go('s03', 2));
    await rest(page);
    await press(page, 'PageUp');
    eq(await where(page), 's03/1', 'Prev un-reveals the last build');
    await page.evaluate(() => Deck.go('s18', 0));
    await rest(page);
    await press(page, 'PageUp');
    eq(await where(page), 's03/1', 'Prev after a jump (here Deck.go) returns to where it came from, at the build it left');
    await finalOf(page, 's17');
    await press(page, 'PageDown');
    const p3 = THREE ? 's17b' : 's18';
    eq(await where(page), p3 + '/0', THREE ? 'Next from s17 -> s17b (three presenters)' : 'Next from s17 skips hidden s17b (two presenters)');
    await press(page, 'PageUp');
    eq(await where(page), 's17/' + await stepsOf(page, 's17'), 'Prev back to s17 in its final state');
    await finalOf(page, 's14b');
    await click(page, '#s14b [data-goto="s15"]');
    eq(await where(page), 's15/0', 'II -> 29 jumps to S15');
    await press(page, 'PageUp');
    eq(await where(page), 's14b/' + await stepsOf(page, 's14b'), 'Prev after a jump returns where it came from');
    await page.evaluate(() => Deck.go('s14c', 0));
    await rest(page);
    await press(page, 'PageDown');
    eq(await where(page), 's14c/1', 'linear again');
  });
});

/* ===================================================================== S02 paths */

test('S02, New York first: four clicks, then S03; d1.first stays unset', async () => {
  await withDeck({ hash: '#s02' }, async (page) => {
    eq(await stepsOf(page, 's02'), 4, 'S02 has four clicks');
    for (let i = 0; i < 4; i++) await press(page, 'PageDown');
    eq(await where(page), 's02/4', 'S02 final');
    await press(page, 'PageDown');
    eq(await where(page), 's03/0', 'Next -> S03');
    eq(await page.evaluate(() => Deck.store.get('d1.first')), undefined, 'd1.first unset (New York first)');
  });
});

test('S02, Munich first: the MUNICH -> 3 chip sets d1.first=MU, S02M runs, Next rejoins S03; Prev retraces the jump', async () => {
  await withDeck({ hash: '#s02' }, async (page) => {
    assert(/MUNICH\s*3/.test(await page.locator('#s02 .s02-goto').innerText()), 'chip reads MUNICH -> 3');
    await press(page, 'PageDown'); // CEO badge (the chip is there from entry; a live talk may click it at any build)
    await click(page, '#s02 .s02-goto');
    eq(await where(page), 's02m/0', 'chip -> S02M (physical 3)');
    eq(await page.evaluate(() => Deck.store.get('d1.first')), 'MU', 'd1.first = MU');
    const n = await stepsOf(page, 's02m');
    for (let i = 0; i < n; i++) await press(page, 'PageDown');
    await press(page, 'PageDown');
    eq(await where(page), 's03/0', 'S02M rejoins S03 (data-next)');
    await press(page, 'PageUp');
    eq(await where(page), 's02m/' + n, 'Prev from S03 returns to S02M final (arrived by data-next)');
    for (let i = 0; i < n; i++) await press(page, 'PageUp');
    await press(page, 'PageUp');
    eq(await where(page), 's02/1', 'Prev from S02M/0 returns to S02 at the build the chip was clicked (arrived by goto): nothing of S02 is given away');
  });
});

/* ===================================================================== S04b triggers */

const OUTCOMES = [
  { t: 'dT', scenario: 'T', method: 'D', cover: '.cover--D', s14: 's14a' },
  { t: 'vT', scenario: 'T', method: 'VOTE', cover: '.cover--vote', s14: 's14a' },
  { t: 'dM', scenario: 'M', method: 'D', cover: '.cover--D', s14: 's14m' },
  { t: 'vM', scenario: 'M', method: 'VOTE', cover: '.cover--vote', s14: 's14m' },
];
for (const oc of OUTCOMES) {
  test('S04b trigger ' + oc.t + ': stamp + cover, d2.scenario=' + oc.scenario + ' d2.method=' + oc.method + ', timer stopped at 1:24, S05 binds it; S13 / ' + oc.s14 + ' / S20 read it', async () => {
    await withDeck({ hash: '#s04b', clock: true }, async (page) => {
      await press(page, 'PageDown'); // click 1 starts the 2:00 timer
      assert(await page.evaluate(() => Object.values(Deck.timers()).some((t) => t.running)), 'timer running after click 1');
      await page.clock.fastForward(84000);
      await page.clock.runFor(300);
      await click(page, '#s04b [data-trigger="' + oc.t + '"]');
      eq(await where(page), 's04b/1', 'a trigger never advances');
      eq([await page.evaluate(() => Deck.store.get('d2.scenario')), await page.evaluate(() => Deck.store.get('d2.method'))], [oc.scenario, oc.method], 'state set');
      eq(await page.evaluate(() => [Deck.store.get('d2.elapsed'), Deck.store.get('d2.elapsed_s')]), ['1:24', '84'], 'elapsed stored');
      assert(await page.evaluate(() => Object.values(Deck.timers()).every((t) => !t.running)), 'timer stopped');
      assert(await isOn(page, '#s04b [data-triggered~="' + oc.t + '"].stamp'), 'stamp shown');
      assert(await isOn(page, '#s04b ' + oc.cover), 'cover shown');
      eq((await page.locator('#s04b ' + oc.cover + ' [data-bind="d2.elapsed"]').innerText()).trim(), '1:24', 'cover shows after 1:24');
      eq(await page.evaluate(() => document.querySelectorAll('#s04b [data-trigger].is-fired').length), 1, 'one trigger fired');
      // exclusive group: a corrected mis-click un-fires the first
      const other = OUTCOMES.find((x) => x.t !== oc.t).t;
      await click(page, '#s04b [data-trigger="' + other + '"]');
      await click(page, '#s04b [data-trigger="' + oc.t + '"]');
      eq(await page.evaluate(() => Array.from(document.querySelectorAll('#s04b [data-trigger].is-fired')).map((n) => n.dataset.trigger)), [oc.t], 'exclusive trigger group');
      eq(await page.evaluate(() => Deck.store.get('d2.method')), oc.method, 'state follows the correction');
      // finish S04b, through the bridge to S05
      const n = await stepsOf(page, 's04b');
      for (let i = 1; i < n; i++) await press(page, 'PageDown');
      await press(page, 'PageDown');
      eq(await where(page), 's05/0', 'S04b -> S04z (auto) -> S05');
      eq((await page.locator('#s05 [data-bind="d2.elapsed"]').innerText()).trim(), '1:24', 'S05 label binds the elapsed time');
      // read again later in the talk
      await page.evaluate(() => Deck.go('s13', 0));
      await rest(page);
      assert(await isOn(page, '#s13 .s13-hint--' + oc.scenario), 'S13 hint shows scenario ' + oc.scenario);
      assert(!(await isOn(page, '#s13 .s13-hint--' + (oc.scenario === 'T' ? 'M' : 'T'))), 'only one S13 hint');
      await page.evaluate((id) => Deck.go(id, 0), oc.s14);
      await rest(page);
      const st = oc.method === 'D' ? '.stamp--D' : '.stamp--vote';
      assert(await isOn(page, '#' + oc.s14 + ' ' + st + '.s14-stamp'), oc.s14 + ' shows the room\'s stamp');
      assert(!(await isOn(page, '#' + oc.s14 + ' .s14-dash')), oc.s14 + ': dashed slot gives way');
      eq((await page.locator('#' + oc.s14 + ' .s14-res [data-bind="d2.elapsed"]').innerText()).trim(), '1:24', oc.s14 + ' after m:ss');
      await page.evaluate(() => Deck.go('s20', 3));
      await rest(page);
      const bars = await page.evaluate(() => Array.from(document.querySelectorAll('#s20 .s20-bar.bar--teal')).filter((b) => !b.classList.contains('is-if-off')).map((b) => b.style.getPropertyValue('--s')));
      eq(bars, ['90'], 'S20 teal bar sized by d2.elapsed_s (84 s -> the 90 s bucket)');
    });
  });
}

/* ===================================================================== chips and the hub */

test('goto chips: printed numbers are physical positions, each lands where it says; S13 M -> 26 -> S14M -> S14B', async () => {
  await withDeck({ hash: '#s12b' }, async (page) => {
    const chips = await page.evaluate(() => Array.from(document.querySelectorAll('#stage [data-goto]')).map((n) => ({ from: n.closest('.slide').id, to: n.dataset.goto, label: n.innerText.replace(/\s+/g, ' ').trim() })));
    for (const c of chips) {
      const m = c.label.match(/(\d+)\s*$/);
      if (!m || c.to.startsWith('@')) continue;
      eq(+m[1], pos(c.to.split('/')[0]), 'chip "' + c.label + '" on ' + c.from + ' names the physical position of ' + c.to);
    }
    await finalOf(page, 's12b');
    await click(page, '#s12b [data-goto="s13"]');
    eq(await where(page), 's13/0', '-> 24 skips quick-fire 2');
    await press(page, 'PageUp');
    eq(await where(page), 's12b/' + await stepsOf(page, 's12b'), 'Prev returns to S12b');
    await page.evaluate(() => Deck.go('s13', 2));
    await rest(page);
    await click(page, '#s13 [data-goto="s14m"]');
    eq(await where(page), 's14m/0', 'M -> 26');
    const n = await stepsOf(page, 's14m');
    for (let i = 0; i < n; i++) await press(page, 'PageDown');
    await press(page, 'PageDown');
    eq(await where(page), 's14b/0', 'S14M rejoins S14B (data-next)');
    await page.evaluate(() => Deck.go('s14a', 0));
    await rest(page);
    for (let i = 0; i <= await stepsOf(page, 's14a'); i++) await press(page, 'PageDown');
    eq(await where(page), 's14b/0', 'S14A -> S14B skips the hidden S14M');
    await press(page, 'PageDown');
    eq(await where(page), 's14c/0', 'S14B -> S14C');
  });
});

test('Q&A hub: S20 -> 36 -> each backup -> back, numbers typed, "end · 35" lands on S20 final, Next ends on S20E', async () => {
  await withDeck({ hash: '#s20' }, async (page) => {
    await finalOf(page, 's20');
    await click(page, '#s20 .s20-hub');
    eq(await where(page), 'h1/0', '-> 36 opens the hub');
    for (const [i, id] of ['h2', 'h3', 'h4', 'h5'].entries()) {
      const label = await page.locator('#h1 [data-goto="' + id + '"]').innerText();
      assert(label.includes(String(37 + i)), 'tile shows ' + (37 + i) + ': ' + label);
      await click(page, '#h1 [data-goto="' + id + '"]');
      eq(await where(page), id + '/0', 'tile -> ' + id);
      await click(page, '#' + id + ' [data-goto="@back"]');
      eq(await where(page), 'h1/0', id + ' back -> hub');
    }
    for (const [n, id] of [[37, 'h2'], [38, 'h3'], [39, 'h4'], [40, 'h5'], [36, 'h1']]) {
      await typeNumber(page, n);
      eq(await where(page), id + '/0', 'typed ' + n);
    }
    await click(page, '#h1 .h1-end');
    eq(await where(page), 's20/' + await stepsOf(page, 's20'), '"end · 35" -> S20 final state');
    await press(page, 'PageDown');
    eq(await where(page), 's20e/0', 'Next from S20 final lands on S20E (backups skipped)');
  });
});

test('S20 stamp chip: shows the D stamp, sets s20.stand=D without advancing; S20E mirrors it', async () => {
  await withDeck({ hash: '#s20' }, async (page) => {
    await finalOf(page, 's20');
    await click(page, '#s20 [data-trigger="d20"]');
    eq(await where(page), 's20/' + await stepsOf(page, 's20'), 'no advance');
    eq(await page.evaluate(() => Deck.store.get('s20.stand')), 'D', 's20.stand');
    assert(await isOn(page, '#s20 .s20-stamp'), 'S20 stamp');
    await press(page, 'PageDown');
    eq(await where(page), 's20e/0', 'S20E');
    assert(await isOn(page, '#s20e .s20-stamp'), 'S20E mirrors the stamp');
  });
});

/* ===================================================================== presenter */

test('mouse and clock: only hotspots react (a near miss on S04B reveals nothing), the first advance counts S01 in (0:30)', async () => {
  await withDeck({ hash: '#s01' }, async (page) => {
    eq(await page.evaluate(() => Deck.clock.elapsed()), 0, 'clock idle on S01');
    await press(page, 'PageDown');
    const c = await page.evaluate(() => Deck.clock.elapsed());
    assert(c >= 30000 && c < 35000, 'the first advance starts the clock at 0:30 (S01 counted in): ' + c);
    await page.evaluate(() => Deck.go('s04b', 1));
    await rest(page);
    const box = await page.locator('#s04b [data-trigger="dT"]').boundingBox();
    await page.mouse.click(box.x + box.width + 20, box.y + box.height / 2); // the gap between two chips
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + 12); // just below the D chip
    await page.mouse.click(1900, 1060);
    await rest(page);
    eq(await where(page), 's04b/1', 'clicks off the chips do not advance');
    eq(await page.evaluate(() => Deck.store.get('d2.method')), undefined, 'and fire nothing');
  });
});

test('presenter view: the four checkpoints, reached / behind states, backups do not tick them, no notes', async () => {
  await withDeck({ hash: '#s01' }, async (page, context) => {
    const [pres] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('p')]);
    await pres.waitForLoadState('load');
    await pres.waitForFunction(() => document.documentElement.classList.contains('dp-connected'), null, { timeout: 8000 });
    const cps = await pres.evaluate(() => Array.from(document.querySelectorAll('.dp-cp')).map((n) => [n.dataset.slide, n.textContent]));
    eq(cps.map((c) => c[0]), CHECKPOINTS.map((c) => c[0]), 'checkpoint slides');
    CHECKPOINTS.forEach(([id, by], i) => assert(cps[i][1].includes(by), id + ' due ' + by + ': ' + cps[i][1]));
    // a backup visit mid-talk ticks nothing
    await page.evaluate(() => { Deck.clock.reset(); Deck.clock.set(60000); Deck.go('h3'); });
    await pres.waitForFunction(() => document.querySelector('.dp-slide').textContent.includes('h3'));
    eq(await pres.evaluate(() => Array.from(document.querySelectorAll('.dp-cp')).map((n) => n.dataset.state)), ['pending', 'pending', 'pending', 'pending'], 'backups do not tick checkpoints');
    // on time at S05, late at S09a
    await page.evaluate(() => { Deck.clock.reset(); Deck.clock.set(7 * 60000); Deck.go('s05'); });
    await pres.waitForFunction(() => document.querySelector('.dp-cp[data-slide="s05"]').dataset.state === 'ahead');
    await page.evaluate(() => { Deck.clock.set(15 * 60000 + 30000); });
    await pres.waitForFunction(() => document.querySelector('.dp-cp[data-slide="s09a"]').dataset.state === 'behind');
    await page.evaluate(() => Deck.go('s09a'));
    await pres.waitForFunction(() => /late|behind/.test(document.querySelector('.dp-cp[data-slide="s09a"]').dataset.state));
    eq(await pres.evaluate(() => document.querySelectorAll('textarea, [contenteditable]').length), 0, 'no notes field');
    // lit-room from the presenter reaches the deck
    await pres.keyboard.press('l');
    await page.waitForFunction(() => document.documentElement.classList.contains('deck-lit'));
    await pres.keyboard.press('l');
    await page.waitForFunction(() => !document.documentElement.classList.contains('deck-lit'));
    await pres.close();
  });
});

/* ===================================================================== print */

test('static exports: PDF = main flow in clicker order + tagged appendix (S04z, S20E, an unused slot left out), PPTX = physical order', async () => {
  const main = VISIBLE.filter((id) => id !== 's04z' && id !== 's20e');
  const pptx = ORDER.filter((id) => id !== 's04z' && (THREE || id !== 's17b'));
  await withDeck({ query: '?print' }, async (page) => {
    const r = await page.evaluate(() => {
      const sl = Array.from(document.querySelectorAll('#stage > .slide'));
      const vis = (n) => n && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
      const shown = sl.filter((s) => getComputedStyle(s).display !== 'none');
      return {
        ids: shown.map((s) => s.id),
        plan: Deck.exportPlan('pdf').map((x) => x.id + ':' + x.part),
        pptx: Deck.exportPlan('pptx').map((x) => x.id + (x.hidden ? '*' : '')),
        tags: shown.filter((s) => vis(s.querySelector(':scope > .deck-variant-tag'))).map((s) => s.id + ':' + s.querySelector(':scope > .deck-variant-tag').textContent),
        hots: Array.from(document.querySelectorAll('.hot')).filter(vis).length,
        unrevealed: Array.from(document.querySelectorAll('[data-step]')).filter((n) => !n.classList.contains('is-revealed')).length,
        s04b: vis(Array.from(document.querySelectorAll('#s04b [data-print-only]')).find((n) => /decided live by the room/.test(n.textContent))),
        s04bStamp: Array.from(document.querySelectorAll('#s04b .stamp')).some(vis),
        s20: Array.from(document.querySelectorAll('#s20 [data-print-only]')).some((n) => vis(n) && /stand-up/.test(n.textContent)),
      };
    });
    eq(r.ids, main.concat(APPENDIX), 'PDF pages: the clicker run, then the appendix');
    eq(r.plan, main.map((id) => id + ':main').concat(APPENDIX.map((id) => id + ':appendix')), 'Deck.exportPlan("pdf")');
    eq(r.tags, APPENDIX.map((id) => id + ':' + TAG[id]), 'appendix pages keep their print tags; nothing else is tagged');
    eq(r.pptx, pptx.map((id) => id + (HIDDEN.includes(id) ? '*' : '')), 'Deck.exportPlan("pptx"): physical order, hidden slides in place');
    eq(r.hots, 0, 'no hotspot printed');
    eq(r.unrevealed, 0, 'every build in its final state');
    assert(r.s04b && !r.s04bStamp, 'S04b: dashed "decided live by the room", no stamp');
    assert(r.s20, 'S20: dashed "stand-up — decided live"');
    const pdf = await page.pdf({ width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    eq(pages, main.length + APPENDIX.length, 'PDF page count (' + (THREE ? '32 + 7' : '31 + 7') + ')');
    eq([...new Set(pageFill(pdf))], [1], 'every page printed full size (no shrink-to-fit from an element outside the stage)');
  });
  await withDeck({ query: '?print&export=pptx' }, async (page) => {
    eq(await page.evaluate(() => Array.from(document.querySelectorAll('#stage > .slide')).filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.id)), pptx, '?print&export=pptx lays out the PPTX plan');
  });
});

/* ===================================================================== team size */

// keys a morph pairs at A's final state (or B's first) — as tools/check-deck.cjs reads them
const keysAt = async (page, id, step) => {
  await page.evaluate(([i, s]) => Deck.go(i, s), [id, step]);
  await rest(page);
  return page.evaluate((sid) => {
    const el = document.getElementById(sid);
    const shown = (n) => { for (let e = n; e && e !== el; e = e.parentElement) { if (e.hasAttribute('data-step') && !e.classList.contains('is-revealed')) return false; if (e.hasAttribute('data-triggered') && !e.classList.contains('is-triggered')) return false; } return true; };
    return Array.from(el.querySelectorAll('[data-morph]')).filter(shown).map((n) => n.getAttribute('data-morph')).filter((k) => /^(mem|ring)-\d$/.test(k)).sort();
  }, id);
};

test('team size: ' + '<html data-presenters> drives the deck; member-3 elements only with three; Part II seams keep their member keys', async () => {
  await withDeck({ hash: '#s01' }, async (page) => {
    const n = THREE ? 3 : 2;
    eq(await page.evaluate(() => [document.documentElement.dataset.presenters, document.documentElement.classList.contains('team-' + document.documentElement.dataset.presenters)]), [String(n), true], 'root data-presenters + team class');
    // every slide at its final build: no member-3 trace with two presenters (the unused slot itself aside)
    const slides = await page.evaluate(() => Deck.slides.filter((x) => !x.unused).map((x) => [x.id, x.steps]));
    const seen = [];
    for (const [id, steps] of slides) {
      await page.evaluate(([i, st]) => Deck.go(i, st), [id, steps]);
      await rest(page);
      const t = await page.evaluate((sid) => {
        const el = document.getElementById(sid);
        const vis = (q) => Array.from(el.querySelectorAll(q)).filter((x) => { const cs = getComputedStyle(x); return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && x.getClientRects().length > 0; }).length;
        return { text: /MEMBER 3|\bP3\b/.test(el.innerText), m3: el.querySelectorAll('[data-member="3"], .g6-mem--3, .g6-mlab--3, .g6-plab--3, .g6-ring--3, [data-morph="mem-3"], [data-morph="ring-3"]').length, vis3: vis('[data-member="3"]') };
      }, id);
      if (t.text || t.m3) seen.push(id + (t.text ? ' text' : '') + (t.m3 ? ' elements:' + t.m3 : '') + (t.vis3 ? ' visible:' + t.vis3 : ''));
    }
    if (THREE) eq(seen, ['s01 text elements:1 visible:1', 's15 text elements:3 visible:3', 's16 text elements:2 visible:2', 's17 text elements:2 visible:2', 's17b text elements:4', 's18 text elements:2 visible:2'], 'three presenters: P3 on S01, S15–S18 and its own slide (S17B: the slot of member 3)');
    else eq(seen, [], 'two presenters: no member-3 element or "MEMBER 3" / "P3" text on any slide');
    // S15: one dot, label and ring per presenter
    await finalOf(page, 's15');
    const s15 = await page.evaluate(() => ['.g6-mem', '.g6-mlab', '.g6-ring'].map((q) => Array.from(document.querySelectorAll('#s15 ' + q)).filter((x) => getComputedStyle(x).opacity > 0).length));
    eq(s15, [n, n, n], 'S15: dots, labels, rings');
    // S18: the bracket spans the outermost of the members who are present
    await finalOf(page, 's18');
    const br = await page.evaluate(() => {
      const r = (q) => document.querySelector(q).getBoundingClientRect();
      const dots = Array.from(document.querySelectorAll('#s18 .g6-mem')).map((d) => { const b = d.getBoundingClientRect(); return b.left + b.width / 2; });
      const b = r('#s18 .g6-bracket');
      return { dots: dots.length, l: Math.round(b.left - Math.min(...dots)), r: Math.round(b.right - Math.max(...dots)) };
    });
    assert(br.dots === n && Math.abs(br.l) <= 2 && Math.abs(br.r) <= 2, 'S18 bracket spans the outer member dots: ' + JSON.stringify(br));
    // morph seams through Part II (clicker order): the member keys match on both sides, rings leave on purpose
    const flow = VISIBLE.slice(VISIBLE.indexOf('s15'), VISIBLE.indexOf('s18') + 1);
    for (let i = 0; i + 1 < flow.length; i++) {
      const a = (await keysAt(page, flow[i], await stepsOf(page, flow[i]))).filter((k) => k.startsWith('mem-'));
      const b = (await keysAt(page, flow[i + 1], 0)).filter((k) => k.startsWith('mem-'));
      eq(b, a, flow[i] + ' -> ' + flow[i + 1] + ': member keys on both sides');
      eq(a, Array.from({ length: n }, (_, k) => 'mem-' + (k + 1)), flow[i] + ': one key per presenter');
    }
  });
});

/* ===================================================================== lit-room */

test('lit-room: L toggles it (pools, grain and glows off), persists across reload, Shift+R keeps it', async () => {
  await withDeck({ hash: '#s05' }, async (page) => {
    const look = () => page.evaluate(() => ({
      lit: document.documentElement.classList.contains('deck-lit'),
      pools: getComputedStyle(document.getElementById('s05')).backgroundImage !== 'none',
      grain: getComputedStyle(document.getElementById('stage'), '::after').content !== 'none',
      glow: getComputedStyle(document.querySelector('#s05 .glyph--D')).textShadow !== 'none' && !/ 0px 0px 0px/.test(getComputedStyle(document.querySelector('#s05 .glyph--D')).textShadow),
    }));
    eq(await look(), { lit: false, pools: true, grain: true, glow: true }, 'dark live');
    await page.keyboard.press('l');
    eq(await look(), { lit: true, pools: false, grain: false, glow: false }, 'lit-room');
    await page.reload();
    await page.waitForFunction(() => window.Deck && Deck.isReady);
    eq((await look()).lit, true, 'kept across reload');
    await page.keyboard.press('Shift+R');
    eq((await look()).lit, true, 'kept by Shift+R');
    await page.keyboard.press('l');
    eq((await look()).lit, false, 'L again: off');
  });
});

/* ===================================================================== real transitions */

test('with motion: every Next from s01 to s20e runs its real transition (morph / fade) without console errors', async () => {
  await withDeck({ hash: '#s01', motion: true, label: 'motion' }, async (page) => {
    let presses = 0;
    const kinds = new Set();
    while ((await page.evaluate(() => Deck.state().id)) !== 's20e' && presses < 400) {
      await press(page, 'PageDown');
      presses += 1;
      kinds.add(await page.evaluate(() => Deck.lastTransition));
    }
    eq(await where(page), 's20e/0', 'reached the end copy');
    assert(kinds.has('view-transition'), 'View Transitions used: ' + [...kinds]);
    // and all the way back with Prev
    let back = 0;
    while ((await where(page)) !== 's01/0' && back < 400) { await press(page, 'PageUp'); back += 1; }
    eq(await where(page), 's01/0', 'Prev all the way back to s01');
  });
});

/* ===================================================================== run */

test('zero console errors or warnings across every page above', async () => {
  eq(consoleErrors, [], 'console');
});

(async () => {
  if (!fs.existsSync(DECK)) { console.error('big-d: deck not found: ' + DECK + ' (run node tools/assemble.cjs)'); process.exit(2); }
  browser = await chromium.launch();
  {
    const { context, page } = await open({ label: 'probe' });
    THREE = await page.evaluate(() => (document.documentElement.dataset.presenters ? document.documentElement.dataset.presenters === '3' : !Deck.slides.find((x) => x.id === 's17b').hidden));
    await context.close();
    if (THREE) {
      HIDDEN = HIDDEN.filter((id) => id !== 's17b');
      VISIBLE = ORDER.filter((id) => !HIDDEN.includes(id));
      console.log('  (three presenters: S17b is shown)');
    }
  }
  const t0 = Date.now();
  let pass = 0;
  let fail = 0;
  const run = tests.filter((t) => !FILTER || t.name.toLowerCase().includes(FILTER.toLowerCase()) || t.name.startsWith('zero console'));
  for (const t of run) {
    const s = Date.now();
    try {
      await t.fn();
      pass += 1;
      console.log('  ok   ' + t.name + ' (' + (Date.now() - s) + ' ms)');
    } catch (e) {
      fail += 1;
      console.log('  FAIL ' + t.name + '\n       ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n       '));
    }
  }
  await browser.close();
  console.log('\n' + path.relative(ROOT, DECK) + ': ' + pass + ' passed, ' + fail + ' failed, ' + run.length + ' total (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  process.exit(fail ? 1 : 0);
})();
