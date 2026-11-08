#!/usr/bin/env node
/*
 * shoot.cjs: screenshots of slides in every state, for builders to LOOK at (Read the PNGs).
 *
 *   node tools/shoot.cjs --deck slides/.tmp-g3.html --slides s09a,s09b --out /tmp/…/shots [options]
 *
 * Per slide (1920x1080 PNG unless --scale):
 *   <id>-b0.png … <id>-b(N-1).png   every build state before the last click (live, no animation)
 *   <id>-final.png                  final build state (live)
 *   <id>-print.png / <id>-paper.png static export (?print) and the paper variant (?print&paper)
 *   <id>-lit.png                    final state in lit-room mode
 *   <id>-beamer.png                 final state under the beamer-washout filter (contrast .75, brightness 1.15, saturate .85)
 *   <id>-fire-<t>.png               with --fire: final state after firing trigger t (one trigger per shot)
 * Options:
 *   --states builds,final,print,paper,lit,beamer   which of the above (default: all)
 *   --fire s04b:dT,vM;s20:d20     triggers to fire (each alone, at the final build); for --morph, the start
 *                                 slide's triggers are fired (in order) before the transition starts
 *   --store "d2.elapsed=1:24;d2.method=D"         live store values set before shooting (data-bind / data-show-if)
 *   --elapsed 84                  advance running timers by N seconds (fake clock) once a timer has started
 *   --morph s01:s02,s04b:s05      mid-transition frames A -> B at --at percent (default 20,45,70); follows
 *                                 auto-advancing bridge slides on the way (one frame set per transition)
 *   --at 20,45,70                 frame positions in % of each transition
 *   --scale 0.5                   output scale (default 1)
 *   --contact                     also write contact.png (all shots as a labelled grid)
 * Safe to run in parallel: own browser, own output directory, nothing shared.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const WASHOUT = 'contrast(.75) brightness(1.15) saturate(.85)';

function parseArgs(argv) {
  const o = { states: 'builds,final,print,paper,lit,beamer', at: '20,45,70', scale: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (k === 'contact') { o.contact = true; continue; }
    o[k] = argv[i + 1];
    i += 1;
  }
  if (!o.deck || !o.out) {
    console.error('usage: node tools/shoot.cjs --deck <deck.html> --out <dir> [--slides a,b] [--states …] [--fire s:t,t] [--store k=v;…] [--elapsed s] [--morph a:b,…] [--at 20,45,70] [--scale 1] [--contact]');
    process.exit(2);
  }
  return o;
}

function list(s) { return String(s || '').split(',').map((x) => x.trim()).filter(Boolean); }

function parseFire(spec) {
  const m = new Map();
  String(spec || '').split(';').map((x) => x.trim()).filter(Boolean).forEach((part) => {
    const [id, t] = part.split(':');
    m.set(id.trim(), list(t));
  });
  return m;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const deck = path.resolve(o.deck);
  if (!fs.existsSync(deck)) throw new Error('deck not found: ' + o.deck);
  const out = path.resolve(o.out);
  fs.mkdirSync(out, { recursive: true });
  const url = pathToFileURL(deck).href;
  const states = new Set(list(o.states));
  const fire = parseFire(o.fire);
  const scale = parseFloat(o.scale) || 1;
  const elapsed = parseFloat(o.elapsed) || 0;
  const errors = [];
  const shots = [];
  const browser = await chromium.launch();

  async function page(opts) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale, reducedMotion: opts && opts.motion ? 'no-preference' : 'reduce' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    if (opts && opts.clock) await p.clock.install();
    await p.goto(url + (opts && opts.query || '') + (opts && opts.hash || ''));
    if (opts && opts.clock) await p.clock.resume();
    await p.waitForFunction(() => window.Deck && window.Deck.isReady, null, { timeout: 30000 });
    if (o.store) await p.evaluate((spec) => spec.split(';').forEach((kv) => { const i = kv.indexOf('='); if (i > 0) window.Deck.store.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }), o.store);
    return { ctx, p };
  }
  const frame = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  async function snap(p, name, target, live) {
    const file = path.join(out, name + '.png');
    // 'disabled' fast-forwards finite animations: right for states, wrong for frozen mid-transition frames
    const animations = live ? 'allow' : 'disabled';
    if (target) await p.locator(target).screenshot({ path: file, animations, scale: 'device' });
    else await p.screenshot({ path: file, animations });
    shots.push(name);
  }

  const { ctx: c0, p: p0 } = await page();
  const meta = await p0.evaluate(() => window.Deck.slides);
  await c0.close();
  const ids = o.slides ? list(o.slides) : meta.map((s) => s.id);
  for (const id of ids) if (!meta.find((s) => s.id === id)) throw new Error('no slide #' + id + ' in ' + o.deck);

  const timerWarp = async (p) => {
    if (!elapsed) return;
    const running = await p.evaluate(() => Object.values(window.Deck.timers()).some((t) => t.running));
    if (running && !p._warped) {
      await p.clock.fastForward(Math.round(elapsed * 1000));
      await p.clock.runFor(400);
      p._warped = true;
    }
  };

  for (const id of ids) {
    const m = meta.find((s) => s.id === id);
    // live: builds + final (+ fire states)
    if (states.has('builds') || states.has('final') || fire.has(id)) {
      const { ctx, p } = await page({ clock: !!elapsed, query: '?noauto', hash: '#' + id });
      for (let s = 0; s <= m.steps; s++) {
        await p.evaluate(([i, st]) => window.Deck.go(i, st), [id, s]);
        await frame(p);
        await timerWarp(p);
        await frame(p);
        if (s < m.steps && states.has('builds')) await snap(p, id + '-b' + s);
        if (s === m.steps && states.has('final')) await snap(p, id + '-final');
      }
      await ctx.close();
      for (const t of fire.get(id) || []) {
        const r = await page({ clock: !!elapsed, query: '?noauto', hash: '#' + id });
        for (let s = 0; s <= m.steps; s++) {
          await r.p.evaluate(([i, st]) => window.Deck.go(i, st), [id, s]);
          await frame(r.p);
          await timerWarp(r.p);
        }
        await r.p.evaluate((name) => window.Deck.trigger(name), t);
        await frame(r.p);
        await snap(r.p, id + '-fire-' + t);
        await r.ctx.close();
      }
    }
    if (states.has('lit') || states.has('beamer')) {
      const { ctx, p } = await page({ query: '?noauto', hash: '#' + id + '/' + m.steps });
      await frame(p);
      if (states.has('beamer')) {
        await p.addStyleTag({ content: 'body { filter: ' + WASHOUT + '; }' });
        await frame(p);
        await snap(p, id + '-beamer');
        await p.addStyleTag({ content: 'body { filter: none; }' });
      }
      await ctx.close();
      if (states.has('lit')) {
        const r = await page({ query: '?lit&noauto', hash: '#' + id + '/' + m.steps });
        await frame(r.p);
        await snap(r.p, id + '-lit');
        await r.ctx.close();
      }
    }
  }
  for (const variant of ['print', 'paper']) {
    if (!states.has(variant)) continue;
    const { ctx, p } = await page({ query: variant === 'print' ? '?print&zoom=1' : '?print&paper&zoom=1' });
    for (const id of ids) await snap(p, id + '-' + variant, '#stage .slide[id="' + id + '"]');
    await ctx.close();
  }

  // mid-transition frames
  const at = list(o.at).map(Number).filter((n) => n > 0 && n < 100);
  for (const pair of list(o.morph)) {
    const [a, b] = pair.split(':').map((x) => x.trim());
    const ma = meta.find((s) => s.id === a);
    if (!ma || !meta.find((s) => s.id === b)) throw new Error('--morph ' + pair + ': unknown slide');
    const { ctx, p } = await page({ motion: true, hash: '#' + a + '/' + ma.steps });
    await p.waitForTimeout(300);
    // --fire on the start slide: leave it the way a talk does (e.g. S04b after the room's stamp)
    if (fire.has(a)) {
      for (const t of fire.get(a)) await p.evaluate((name) => window.Deck.trigger(name), t);
      await p.waitForTimeout(500);
    }
    let from = a;
    for (let hop = 0; hop < 4; hop++) {
      const cur = await p.evaluate(() => window.Deck.state().id);
      if (cur === b && hop > 0) break;
      // start the transition (only on the first hop; later hops are auto-advances) and freeze it at once
      const info = await p.evaluate(([first, target]) => new Promise((res) => {
        const isVT = (an) => an.effect && an.effect.pseudoElement && an.effect.pseudoElement.indexOf('::view-transition') === 0;
        const t0 = performance.now();
        const tick = () => {
          const vt = document.getAnimations().filter(isVT);
          if (vt.length) {
            const all = document.getAnimations();
            all.forEach((an) => an.pause());
            const end = Math.max(...vt.map((an) => { const t = an.effect.getComputedTiming(); return t.endTime; }));
            window.__shootAnims = all;
            res({ end, to: window.Deck.state().id });
          } else if (performance.now() - t0 > 6000) res(null);
          else requestAnimationFrame(tick);
        };
        if (first) {
          // the way a talk gets there: Next if the target is the next slide (or reached through
          // auto-advancing bridges), otherwise a jump
          const sl = window.Deck.slides;
          let k = window.Deck.state().index + 1;
          while (sl[k] && sl[k].hidden) k += 1;
          while (sl[k] && sl[k].id !== target && sl[k].auto != null) k += 1;
          if (sl[k] && sl[k].id === target) window.Deck.next();
          else window.Deck.go(target);
        }
        tick();
      }), [hop === 0, b]);
      if (!info) { errors.push('shoot: no View Transition seen after ' + from + ' (transition "none", or reduced motion?)'); break; }
      for (const pct of at) {
        await p.evaluate((t) => window.__shootAnims.forEach((an) => { try { an.currentTime = t; } catch { /* finished */ } }), info.end * pct / 100);
        await frame(p);
        await snap(p, 'morph-' + from + '-' + info.to + '-' + String(pct).padStart(2, '0'), null, true);
      }
      await p.evaluate(() => window.__shootAnims.forEach((an) => an.play()));
      await p.waitForFunction(() => !document.documentElement.classList.contains('deck-vt'), null, { timeout: 8000 });
      await p.waitForTimeout(50);
      from = info.to;
      if (info.to === b) break;
    }
    await snap(p, 'morph-' + a + '-' + b + '-landed');
    await ctx.close();
  }

  if (o.contact && shots.length) {
    const html = '<!doctype html><html><body style="margin:0;background:#222;font:16px system-ui;color:#ddd">' +
      '<div style="display:grid;grid-template-columns:repeat(4,480px);gap:14px;padding:14px">' +
      shots.map((s) => '<figure style="margin:0"><img src="' + pathToFileURL(path.join(out, s + '.png')).href + '" style="width:480px;height:270px;display:block;background:#000"><figcaption style="padding:4px 0">' + s + '</figcaption></figure>').join('') +
      '</div></body></html>';
    const tmp = path.join(out, '.contact-' + process.pid + '.html');
    fs.writeFileSync(tmp, html);
    const ctx = await browser.newContext({ viewport: { width: 4 * 480 + 5 * 14, height: 400 } });
    const p = await ctx.newPage();
    await p.goto(pathToFileURL(tmp).href);
    await p.waitForLoadState('load');
    await p.screenshot({ path: path.join(out, 'contact.png'), fullPage: true });
    await ctx.close();
    fs.rmSync(tmp, { force: true });
  }
  await browser.close();
  console.log('shoot: ' + shots.length + ' PNG(s) in ' + out);
  errors.forEach((e) => console.warn('shoot: page error: ' + e));
  if (errors.length) process.exitCode = 1;
}

main().catch((e) => { console.error('shoot: ' + (e && e.stack || e)); process.exit(1); });
