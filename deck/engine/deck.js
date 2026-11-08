/*!
 * deck.js: design-agnostic HTML presentation engine. No runtime dependencies.
 *
 * Markup contract (full text in deck/README.md):
 *   <div id="stage"> <section class="slide" id="s01" data-transition="morph|fade|none"> ... </section> ... </div>
 *   data-step="n"            revealed at click n (entrance-only builds; final state == markup state)
 *   data-build="fade|rise|drop|left|right|wipe|wipe-left|wipe-down|wipe-up|zoom|slam|none"   entrance effect
 *   data-enter[="effect"]    entrance played when the slide is entered going forward
 *   data-delay="ms" / data-duration="ms"
 *   data-morph="key"         persistent element, paired across slides by the View Transitions API
 *                            (an incoming element whose partner shows the same text gets data-morph-same
 *                            during the transition, for designs that swap only changed words)
 *   data-hidden[="backup"|"unused"]   skipped by linear navigation, reachable by number or data-goto
 *                            "unused": an empty member slot kept for stable numbers (no tag, never exported,
 *                            not reachable by number)
 *   data-export="none|pdf|pptx|pdf pptx"   static exports that carry the slide (default: both; auto bridges
 *                            and unused slots: none). PDF = main flow in clicker order, then the hidden slides
 *                            as an appendix; PPTX = physical order, hidden slides stay hidden (show="0")
 *   data-next="id"           what Next does at the end of this slide
 *   data-auto="ms"           auto-advance (bridge slides)
 *   data-goto="id|id/step|@back"            hotspot jump
 *   data-trigger="x" [data-trigger-group="g"] [data-set="k=v;k2=v2"] [data-stop-timer="timerId ..."]
 *   data-triggered="x y"     revealed when any of the listed triggers fired on this slide
 *   data-timer="120" [data-timer-store="key"]    countdown, starts when revealed
 *   data-bind="key" data-print="text"           live text
 *   data-show-if="key==V"    live condition; data-print="show" shows it in print
 *   data-print="hide" / data-print-only          print-time visibility
 *   data-folio-text[="2"]    filled with the slide's visible number (folio), optionally zero-padded
 * #deck-config (JSON): title, transition, checkpoints [{slide, by}], lateTolerance (s), clockLead (s counted in
 *   when the first advance leaves the opening slide), clickAdvance (false: a click off a hotspot does nothing)
 * Root classes added by the engine for designs: deck-lit (lit-room mode, key L), deck-paper (?paper).
 */
(() => {
  'use strict';
  if (window.Deck && window.Deck.version) return;

  const VERSION = '1.4.0';
  const W = 1920;
  const H = 1080;
  const NS = 'ccc-deck/1';
  const doc = document;
  const root = doc.documentElement;
  const params = new URLSearchParams(location.search);
  const rawHash = safeDecode(location.hash.replace(/^#/, ''));
  const PAPER = params.has('paper') && params.get('paper') !== '0';
  const LIT_PARAM = params.has('lit') ? params.get('lit') !== '0' : null;
  const MODE = params.has('print') ? 'print'
    : params.has('embed') ? 'embed'
      : (params.has('presenter') || rawHash === 'presenter') ? 'presenter'
        : 'audience';
  const PANE = params.get('embed') || '';
  // which static export a print layout shows: ?print = the PDF (default), &export=pptx, &export=all (every slide, physical order)
  const EXPORT_KINDS = ['pdf', 'pptx', 'all'];
  const PRINT_EXPORT = EXPORT_KINDS.includes(params.get('export')) ? params.get('export') : 'pdf';
  const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter']);
  const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']);
  const TRANSITIONS = ['morph', 'fade', 'none'];
  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const STORE_KEY = 'deck-live:' + location.pathname;
  const noop = () => {};

  let stage = null;
  let slides = [];
  let metas = [];
  let config = {};
  let checkpoints = [];
  let cur = { index: 0, step: 0 };
  let shownIndex = -1;
  let live = freshLive();
  let black = false;
  let helpOpen = false;
  let printing = false;
  let reordered = false;
  let jumpBuf = '';
  let jumpTimer = 0;
  let activeVT = null;
  let activeVTApply = null;
  let xfade = null;
  let autoTimer = 0;
  let navToken = 0;
  let lastTransition = 'none';
  let presenterWin = null;
  let lastRemote = null;
  let lastRemoteAt = 0;
  let mirrorSig = '';
  let chipClick = { t: -Infinity, x: 0, y: 0 };
  let resetArmedAt = 0;
  let resetBtnTimer = 0;
  const doneTimers = new Set();
  const ui = {};
  const handlers = {};
  let readyResolve = noop;
  const ready = new Promise((r) => { readyResolve = r; });
  let isReady = false;

  /* ------------------------------------------------------------------ utils */

  function freshLive() {
    return { store: {}, timers: {}, fired: {}, history: [], clock: { acc: 0, since: null }, reached: {}, lit: false };
  }
  function safeDecode(s) { try { return decodeURIComponent(s); } catch { return s; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function tokens(s) { return String(s || '').split(/[\s,]+/).filter(Boolean); }
  function fmt(sec) {
    const s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function parseTime(v) {
    if (typeof v === 'number') return v;
    const parts = String(v || '').trim().split(':').map((x) => parseFloat(x) || 0);
    return parts.reduce((acc, x) => acc * 60 + x, 0);
  }
  function sanitizeKey(k) { return String(k || '').trim().replace(/[^A-Za-z0-9_-]/g, '_'); }
  function now() { return Date.now(); }
  function reducedMotion() { return !!(reduceMQ && reduceMQ.matches) || params.has('nomotion'); }
  function esc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }
  function indexOfId(id) { return metas.findIndex((m) => m.id === id); }
  function emit(name, detail) {
    (handlers[name] || []).slice().forEach((fn) => { try { fn(detail); } catch (e) { console.warn('[deck] handler failed', e); } });
    try { doc.dispatchEvent(new CustomEvent('deck:' + name, { detail })); } catch { /* old browsers */ }
  }

  /* --------------------------------------------------------------- storage */

  function save() {
    if (MODE !== 'audience') return;
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, live, cur })); } catch { /* storage blocked */ }
  }
  function load() {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (d && d.v === 1 && d.live) return d;
    } catch { /* ignore */ }
    return null;
  }
  function adoptLive(l) {
    const f = freshLive();
    if (!l || typeof l !== 'object') return f;
    return {
      store: l.store && typeof l.store === 'object' ? l.store : f.store,
      timers: l.timers && typeof l.timers === 'object' ? l.timers : f.timers,
      fired: l.fired && typeof l.fired === 'object' ? l.fired : f.fired,
      history: Array.isArray(l.history) ? l.history.filter((h) => h && typeof h.id === 'string') : f.history,
      clock: l.clock && typeof l.clock === 'object' ? { acc: +l.clock.acc || 0, since: l.clock.since || null } : f.clock,
      reached: l.reached && typeof l.reached === 'object' ? l.reached : f.reached,
      lit: !!l.lit,
    };
  }

  /* ------------------------------------------------------------ discovery */

  function readConfig() {
    let c = {};
    const el = doc.getElementById('deck-config');
    if (el) {
      try { c = JSON.parse(el.textContent || '{}') || {}; } catch (e) { console.warn('[deck] invalid #deck-config JSON', e); }
    }
    if (window.DECK_CONFIG && typeof window.DECK_CONFIG === 'object') c = Object.assign({}, c, window.DECK_CONFIG);
    return c;
  }

  function titleOf(el, id) {
    if (el.dataset.title) return el.dataset.title.trim();
    const h = el.querySelector('[data-title-text], h1, h2, h3');
    const t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    return t || id;
  }

  function collect() {
    stage = doc.getElementById('stage');
    if (!stage) {
      stage = doc.createElement('div');
      stage.id = 'stage';
      const found = doc.querySelectorAll('section.slide');
      if (found.length) found[0].parentNode.insertBefore(stage, found[0]);
      else doc.body.appendChild(stage);
      found.forEach((s) => stage.appendChild(s));
    }
    stage.classList.add('deck-stage');
    slides = Array.from(stage.querySelectorAll('.slide')).filter((s) => !s.parentElement.closest('.slide'));
    const seen = new Set();
    metas = slides.map((el, i) => {
      let id = el.id;
      if (!id || seen.has(id)) {
        if (id) console.warn('[deck] duplicate slide id "' + id + '"; renamed');
        id = 'slide-' + (i + 1);
        el.id = id;
      }
      seen.add(id);
      let steps = 0;
      el.querySelectorAll('[data-step]').forEach((n) => {
        const s = parseInt(n.getAttribute('data-step'), 10);
        if (s > steps) steps = s;
      });
      const t = (el.getAttribute('data-transition') || config.transition || 'fade').toLowerCase();
      const autoAttr = el.getAttribute('data-auto');
      const hiddenAttr = el.getAttribute('data-hidden');
      const auto = autoAttr === null ? null : Math.max(0, parseInt(autoAttr, 10) || 0);
      return {
        el,
        id,
        index: i,
        pos: i + 1,
        steps,
        hidden: hiddenAttr !== null,
        hiddenKind: hiddenAttr || '',
        unused: hiddenAttr === 'unused',
        auto,
        exports: exportKinds(el.getAttribute('data-export'), auto != null, hiddenAttr === 'unused'),
        next: el.getAttribute('data-next') || null,
        transition: TRANSITIONS.includes(t) ? t : 'fade',
        title: titleOf(el, id),
      };
    });
    checkpoints = (Array.isArray(config.checkpoints) ? config.checkpoints : []).map((c) => ({
      slide: String(c.slide || ''),
      by: parseTime(c.by != null ? c.by : c.at),
      label: c.label || '',
      index: indexOfId(String(c.slide || '')),
    })).filter((c) => {
      if (c.index < 0) console.warn('[deck] checkpoint slide "' + c.slide + '" not found');
      return c.index >= 0;
    });
  }

  /**
   * Static-export membership of a slide. data-export lists the exports that carry it ("pdf", "pptx", both, or
   * "none"); without it every slide is in both, except auto-advancing bridges and unused member slots.
   */
  function exportKinds(attr, isAuto, isUnused) {
    if (attr != null && attr.trim()) {
      const t = tokens(attr.toLowerCase());
      if (t.includes('none')) return [];
      return ['pdf', 'pptx'].filter((k) => t.includes(k));
    }
    return isAuto || isUnused ? [] : ['pdf', 'pptx'];
  }

  function isInteractive(n) {
    return n.matches('a[href], button, input, select, textarea, summary');
  }

  /**
   * Folio: the visible-slide number. Hidden slides are not counted (no number); an auto-advancing
   * bridge slide repeats the number of the slide before it. The design formats and places it.
   */
  function assignFolios() {
    let n = 0;
    metas.forEach((m) => {
      if (!m.hidden && (m.auto == null || n === 0)) n += 1;
      m.folio = m.hidden ? '' : String(n);
    });
    stage.setAttribute('data-folio-total', String(n));
    metas.forEach((m) => {
      const el = m.el;
      el.setAttribute('data-folio', m.folio);
      if (m.hidden) el.setAttribute('data-folio-hidden', m.hiddenKind === 'backup' || m.unused ? m.hiddenKind : 'variant');
      else el.removeAttribute('data-folio-hidden');
      el.querySelectorAll('[data-folio-text]').forEach((t) => {
        const pad = parseInt(t.getAttribute('data-folio-text'), 10) || 0;
        const text = m.hidden ? '' : m.folio.padStart(pad, '0');
        if (t.textContent !== text) t.textContent = text;
      });
    });
  }

  function prepare() {
    assignFolios();
    slides.forEach((el, i) => {
      const m = metas[i];
      el.setAttribute('data-pos', String(m.pos));
      if (!el.hasAttribute('aria-roledescription')) el.setAttribute('aria-roledescription', 'slide');
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', m.pos + ': ' + m.title);
      let tk = 0;
      el.querySelectorAll('[data-timer]').forEach((n) => {
        if (!n.dataset.timerId) n.dataset.timerId = n.id || (m.id + '-timer-' + (++tk));
        if (!n.querySelector('[data-timer-text]')) {
          const s = doc.createElement('span');
          s.className = 'deck-timer-text';
          s.setAttribute('data-timer-text', '');
          n.appendChild(s);
        }
        if (!n.querySelector('[data-timer-bar]')) {
          const b = doc.createElement('span');
          b.className = 'deck-timer-bar';
          b.setAttribute('data-timer-bar', '');
          b.setAttribute('aria-hidden', 'true');
          const f = doc.createElement('span');
          f.className = 'deck-timer-fill';
          b.appendChild(f);
          n.appendChild(b);
        }
        n.setAttribute('role', 'timer');
      });
      el.querySelectorAll('[data-bind]').forEach((n) => {
        if (!n.hasAttribute('data-bind-default')) n.setAttribute('data-bind-default', n.textContent);
      });
      el.querySelectorAll('[data-delay]').forEach((n) => n.style.setProperty('--deck-delay', (parseFloat(n.dataset.delay) || 0) + 'ms'));
      el.querySelectorAll('[data-duration]').forEach((n) => n.style.setProperty('--deck-duration', (parseFloat(n.dataset.duration) || 0) + 'ms'));
      el.querySelectorAll('[data-trigger], [data-goto]').forEach((n) => {
        if (n.tagName === 'BUTTON' && !n.hasAttribute('type')) n.type = 'button';
        if (!isInteractive(n)) {
          n.setAttribute('role', 'button');
          if (!n.hasAttribute('tabindex')) n.tabIndex = 0;
        }
        if (n.hasAttribute('data-trigger')) n.setAttribute('aria-pressed', 'false');
      });
      if (m.hidden && !m.unused && !el.querySelector(':scope > .deck-variant-tag')) {
        const tag = doc.createElement('div');
        tag.className = 'deck-variant-tag';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = el.dataset.printTag || (m.hiddenKind === 'backup' ? 'Backup · hidden slide' : 'Variant · chosen live');
        el.appendChild(tag);
      }
    });
  }

  /* ------------------------------------------------------------- the store */

  function storeGet(k) { return live.store[k]; }
  function storeSet(k, v, quiet) {
    if (v == null) delete live.store[k];
    else live.store[k] = String(v);
    if (!quiet) refresh();
  }
  function applySet(spec) {
    if (!spec) return false;
    let changed = false;
    String(spec).split(';').forEach((pair) => {
      const i = pair.indexOf('=');
      if (i < 1) return;
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (k) { live.store[k] = v; changed = true; }
    });
    return changed;
  }
  function unquote(s) {
    const t = String(s).trim();
    return /^(["']).*\1$/.test(t) ? t.slice(1, -1) : t;
  }
  function evalTerm(term) {
    const m = term.match(/^(!?)\s*([A-Za-z0-9_.$-]+)\s*(?:(==|!=|>=|<=|>|<)\s*(.*))?$/);
    if (!m) { console.warn('[deck] bad data-show-if term: ' + term); return false; }
    const v = live.store[m[2]];
    if (!m[3]) {
      const truthy = v != null && v !== '' && v !== 'false' && v !== '0';
      return m[1] ? !truthy : truthy;
    }
    const rhs = unquote(m[4]);
    let r;
    switch (m[3]) {
      case '==': r = String(v == null ? '' : v) === rhs; break;
      case '!=': r = String(v == null ? '' : v) !== rhs; break;
      default: {
        const a = parseFloat(v);
        const b = parseFloat(rhs);
        if (Number.isNaN(a) || Number.isNaN(b)) r = false;
        else r = m[3] === '>' ? a > b : m[3] === '<' ? a < b : m[3] === '>=' ? a >= b : a <= b;
      }
    }
    return m[1] ? !r : r;
  }
  function evalCond(expr) {
    return String(expr || '').split('||').some((or) => or.split('&&').every((t) => evalTerm(t.trim())));
  }

  /* ------------------------------------------------------------- rendering */

  function firedSet(id) { return new Set(live.fired[id] || []); }

  function renderSlide(el, slideId, step, print) {
    const fired = print ? new Set() : firedSet(slideId);
    el.querySelectorAll('[data-step]').forEach((n) => {
      const s = parseInt(n.getAttribute('data-step'), 10) || 1;
      n.classList.toggle('is-revealed', print || s <= step);
    });
    el.querySelectorAll('[data-triggered]').forEach((n) => {
      const on = print ? n.getAttribute('data-print') === 'show' : tokens(n.getAttribute('data-triggered')).some((t) => fired.has(t));
      n.classList.toggle('is-triggered', on);
    });
    el.querySelectorAll('[data-trigger]').forEach((n) => {
      const on = !print && fired.has(n.getAttribute('data-trigger'));
      n.classList.toggle('is-fired', on);
      n.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    el.querySelectorAll('[data-show-if]').forEach((n) => {
      const on = print ? n.getAttribute('data-print') === 'show' : evalCond(n.getAttribute('data-show-if'));
      n.classList.toggle('is-if-off', !on);
    });
    el.querySelectorAll('[data-bind]').forEach((n) => renderBind(n, print));
    el.querySelectorAll('[data-timer]').forEach((n) => renderTimer(n, print));
  }

  function renderBind(n, print) {
    const key = n.getAttribute('data-bind');
    let text;
    if (print) {
      text = n.hasAttribute('data-print') ? n.getAttribute('data-print') : (n.getAttribute('data-bind-default') || '');
    } else {
      const v = live.store[key];
      text = v == null || v === '' ? (n.getAttribute('data-bind-default') || '') : String(v);
    }
    if (n.textContent !== text) n.textContent = text;
  }

  function timerInfo(n) {
    const dur = parseFloat(n.getAttribute('data-timer')) || 0;
    const t = live.timers[n.dataset.timerId];
    let elapsed = 0;
    let state = 'idle';
    if (t) {
      elapsed = Math.max(0, ((t.stop || now()) - t.start) / 1000);
      state = t.stop ? 'stopped' : (elapsed >= dur ? 'done' : 'running');
    }
    return { dur, elapsed, state, remaining: Math.max(0, dur - elapsed) };
  }

  function renderTimer(n, print) {
    let text;
    let progress;
    let state;
    if (print) {
      const dur = parseFloat(n.getAttribute('data-timer')) || 0;
      text = n.hasAttribute('data-print') ? n.getAttribute('data-print') : fmt(dur);
      progress = parseFloat(n.getAttribute('data-print-progress'));
      if (Number.isNaN(progress)) progress = 1;
      state = 'print';
    } else {
      const ti = timerInfo(n);
      text = fmt(Math.ceil(ti.remaining - 1e-6));
      progress = ti.dur ? Math.min(1, ti.elapsed / ti.dur) : 0;
      state = ti.state;
      if (state === 'done' && MODE === 'audience' && !doneTimers.has(n.dataset.timerId)) {
        doneTimers.add(n.dataset.timerId);
        emit('timerdone', { id: n.dataset.timerId });
      }
    }
    const te = n.querySelector('[data-timer-text]');
    if (te && te.textContent !== text) te.textContent = text;
    const p = progress.toFixed(4);
    if (n.style.getPropertyValue('--deck-progress') !== p) n.style.setProperty('--deck-progress', p);
    if (n.getAttribute('data-timer-state') !== state) n.setAttribute('data-timer-state', state);
  }

  /** Is node n currently visible within its slide (all build/trigger/show-if ancestors on)? */
  function isShown(n, slideEl) {
    for (let e = n; e && e !== slideEl; e = e.parentElement) {
      if (e.hasAttribute('data-step') && !e.classList.contains('is-revealed')) return false;
      if (e.hasAttribute('data-triggered') && !e.classList.contains('is-triggered')) return false;
      if (e.classList.contains('is-if-off')) return false;
    }
    return true;
  }

  function startRevealedTimers(i) {
    if (MODE !== 'audience' || printing) return false;
    const el = slides[i];
    let started = false;
    el.querySelectorAll('[data-timer]').forEach((n) => {
      const id = n.dataset.timerId;
      if (!live.timers[id] && isShown(n, el)) {
        live.timers[id] = { start: now(), stop: null };
        doneTimers.delete(id);
        started = true;
        renderTimer(n, false);
        emit('timerstart', { id });
      }
    });
    return started;
  }

  function stopTimers(i, spec) {
    const el = slides[i];
    const ids = spec ? tokens(spec) : Array.from(el.querySelectorAll('[data-timer]')).map((n) => n.dataset.timerId);
    ids.forEach((id) => {
      const t = live.timers[id];
      if (!t || t.stop) return;
      t.stop = now();
      const n = stage.querySelector('[data-timer-id="' + esc(id) + '"]');
      const key = n && n.getAttribute('data-timer-store');
      if (key) {
        const secs = Math.round((t.stop - t.start) / 1000);
        live.store[key] = fmt(secs);
        live.store[key + '_s'] = String(secs);
      }
      emit('timerstop', { id, elapsed: (t.stop - t.start) / 1000 });
    });
  }

  function refresh() {
    if (printing) return;
    if (slides[cur.index]) {
      renderSlide(slides[cur.index], metas[cur.index].id, cur.step, false);
      startRevealedTimers(cur.index);
    }
    afterChange();
  }

  /* ---------------------------------------------------------- slide display */

  // Names the revealed [data-morph] elements of slideEl. With prevEl (the outgoing slide, already captured),
  // an incoming element whose shown partner has the same text gets data-morph-same for the transition, so a
  // design can let unchanged words travel steadily instead of swapping them (e.g. an unchanged breadcrumb).
  function setMorphNames(slideEl, prevEl) {
    stage.querySelectorAll('[data-morph]').forEach((n) => {
      if (n.style.viewTransitionName) n.style.viewTransitionName = '';
      if (n.hasAttribute('data-morph-same')) n.removeAttribute('data-morph-same');
    });
    if (!slideEl) return;
    const seen = new Set();
    const before = new Map();
    if (prevEl && prevEl !== slideEl) {
      prevEl.querySelectorAll('[data-morph]').forEach((p) => {
        const k = sanitizeKey(p.getAttribute('data-morph'));
        if (k && !before.has(k) && isShown(p, prevEl)) before.set(k, p);
      });
    }
    slideEl.querySelectorAll('[data-morph]').forEach((n) => {
      const key = sanitizeKey(n.getAttribute('data-morph'));
      if (!key) return;
      if (seen.has(key)) { console.warn('[deck] duplicate data-morph "' + key + '" on #' + slideEl.id); return; }
      if (!isShown(n, slideEl)) return;
      seen.add(key);
      n.style.viewTransitionName = 'deck-m-' + key;
      const p = before.get(key);
      if (p && p.textContent.replace(/\s+/g, ' ').trim() === n.textContent.replace(/\s+/g, ' ').trim()) n.setAttribute('data-morph-same', '');
    });
  }

  function stripAnim(el) {
    el.querySelectorAll('.deck-anim').forEach((n) => n.classList.remove('deck-anim'));
  }

  function showOnly(i, enter) {
    slides.forEach((s, j) => {
      const on = j === i;
      if (!on && s.classList.contains('is-active')) stripAnim(s);
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
      if ('inert' in s) s.inert = !on;
    });
    shownIndex = i;
    const el = slides[i];
    renderSlide(el, metas[i].id, cur.index === i ? cur.step : 0, false);
    if (enter && !reducedMotion()) {
      el.querySelectorAll('[data-enter]').forEach((n) => { if (isShown(n, el)) n.classList.add('deck-anim'); });
    }
    return startRevealedTimers(i);
  }

  function cleanupVT() {
    root.classList.remove('deck-vt', 'deck-vt-morph', 'deck-vt-fade');
  }

  function finishTransitions() {
    if (activeVT) {
      const vt = activeVT;
      const apply = activeVTApply;
      activeVT = null;
      activeVTApply = null;
      try { vt.skipTransition(); } catch { /* already done */ }
      cleanupVT();
      // Skipping only schedules an update callback that has not run yet; apply it now, so the DOM is at the
      // transition's end state when this returns (a no-op if it already ran or a newer move superseded it).
      if (apply) apply();
    }
    if (xfade) xfade.finish();
  }

  function afterShown(token) {
    if (token !== navToken) return;
    const m = metas[cur.index];
    clearTimeout(autoTimer);
    // ?noauto: bridges hold (screenshots of a bridge slide; tools only)
    if (MODE === 'audience' && m.auto != null && !printing && !params.has('noauto')) {
      autoTimer = setTimeout(() => {
        if (token === navToken && !black) next({ auto: true });
      }, m.auto);
    }
    emit('shown', state());
  }

  function changeSlide(fromIndex, toIndex, o) {
    clearTimeout(autoTimer);
    // New token first: a transition finished early below must not schedule auto-advance or emit 'shown'.
    const token = ++navToken;
    finishTransitions();
    const type = o.transition || (o.backward ? metas[fromIndex].transition : metas[toIndex].transition);
    const enter = !o.backward;
    const oldEl = shownIndex >= 0 ? slides[shownIndex] : null;
    let mode;
    if (o.instant || type === 'none' || reducedMotion() || printing || MODE !== 'audience' || !oldEl || oldEl === slides[toIndex]) mode = 'instant';
    else if (typeof doc.startViewTransition === 'function' && !params.has('novt')) mode = 'view-transition';
    else mode = 'fallback';
    lastTransition = mode;
    root.setAttribute('data-deck-transition', mode);

    const update = () => {
      // A View Transition's update callback runs asynchronously, and still runs after the transition
      // was skipped. If a newer navigation (or print) has taken over by then, it owns the DOM: re-running
      // this one would replay entrances on a backward entry, leak morph names or un-print a slide.
      if (token !== navToken || printing) return false;
      setMorphNames(null);
      const started = showOnly(cur.index, enter);
      if (type === 'morph' && mode === 'view-transition') setMorphNames(slides[cur.index], oldEl);
      return started;
    };

    if (mode === 'instant') {
      update();
      afterShown(token);
      return;
    }
    if (mode === 'view-transition') {
      if (type === 'morph') setMorphNames(oldEl);
      else setMorphNames(null);
      root.classList.add('deck-vt', 'deck-vt-' + type);
      let vt = null;
      let applied = false;
      const apply = () => {
        if (applied) return;
        applied = true;
        // go() saved and broadcast before this ran: a timer revealed on entry starts only now.
        if (update()) afterChange();
      };
      try {
        vt = doc.startViewTransition(apply);
      } catch {
        cleanupVT();
        update();
        afterShown(token);
        return;
      }
      activeVT = vt;
      activeVTApply = apply;
      if (vt.ready) vt.ready.catch(noop);
      if (vt.updateCallbackDone) vt.updateCallbackDone.catch(noop);
      Promise.resolve(vt.finished).catch(noop).then(() => {
        if (activeVT === vt) {
          activeVT = null;
          activeVTApply = null;
          cleanupVT();
        }
        if (token === navToken) setMorphNames(null);
        afterShown(token);
      });
      return;
    }
    // Fallback: CSS crossfade of the outgoing over the incoming slide.
    update();
    oldEl.classList.add('deck-leaving');
    const newEl = slides[cur.index];
    newEl.classList.add('deck-xfade-in');
    const finish = () => {
      if (!xfade || xfade.token !== token) return;
      clearTimeout(xfade.timer);
      xfade = null;
      oldEl.classList.remove('deck-leaving');
      newEl.classList.remove('deck-xfade-in');
      afterShown(token);
    };
    const dur = parseFloat(getComputedStyle(root).getPropertyValue('--deck-fallback-duration')) || 350;
    xfade = { token, finish, timer: setTimeout(finish, dur + 30) };
  }

  /* ------------------------------------------------------------ navigation */

  function linearNext(i) {
    for (let j = i + 1; j < metas.length; j++) if (!metas[j].hidden) return j;
    return -1;
  }
  function linearPrev(i) {
    for (let j = i - 1; j >= 0; j--) if (!metas[j].hidden && metas[j].auto == null) return j;
    return -1;
  }
  function firstLinear() { const j = metas.findIndex((m) => !m.hidden); return j < 0 ? 0 : j; }
  function lastLinear() {
    for (let j = metas.length - 1; j >= 0; j--) if (!metas[j].hidden) return j;
    return metas.length - 1;
  }

  function nextTarget(c) {
    const at = c || cur;
    const m = metas[at.index];
    if (!m) return null;
    if (at.step < m.steps) return { index: at.index, step: at.step + 1, kind: 'step' };
    if (m.next) {
      const j = indexOfId(m.next);
      if (j >= 0) return { index: j, step: 0, kind: 'jump' };
      console.warn('[deck] data-next target "' + m.next + '" not found');
    }
    const j = linearNext(at.index);
    return j < 0 ? null : { index: j, step: 0, kind: 'linear' };
  }

  // History frames are stored by slide id (they persist across reloads, and the deck may be edited between them).
  function hIndex(frame) { return frame ? indexOfId(frame.id) : -1; }
  function topIndex() { return hIndex(live.history[live.history.length - 1]); }
  function pushHistory(index, linear) {
    const h = live.history;
    const top = h[h.length - 1];
    if (top && hIndex(top) === index && top.linear === linear) return;
    h.push({ id: metas[index].id, linear });
    if (h.length > 300) h.splice(0, h.length - 300);
  }
  function isAutoFrame(frame) { const i = hIndex(frame); return i < 0 || metas[i].auto != null; }

  /** The single state transition. Everything that moves goes through here. */
  function go(target, o) {
    const opts = o || {};
    if (!target || !metas.length) return false;
    const index = clamp(target.index | 0, 0, slides.length - 1);
    const step = clamp(target.step | 0, 0, metas[index].steps);
    const from = { index: cur.index, step: cur.step };
    if (index === from.index && step === from.step && !opts.force) return false;
    cur = { index, step };
    if (index === from.index && shownIndex === index) {
      applyStepChange(from.step, step);
    } else {
      if (opts.kind === 'linear' || opts.kind === 'auto') pushHistory(index, true);
      else if (opts.kind === 'jump') {
        // Remember the build being left, so Prev after the jump returns to it (not to the final state,
        // which would show the audience every build of the origin slide).
        const top = live.history[live.history.length - 1];
        if (top && hIndex(top) === from.index) top.step = from.step;
        pushHistory(index, false);
      }
      changeSlide(from.index, index, { backward: !!opts.backward, instant: !!opts.instant, transition: opts.transition });
    }
    afterChange();
    return true;
  }

  function applyStepChange(fromStep, toStep) {
    const el = slides[cur.index];
    const id = metas[cur.index].id;
    if (toStep > fromStep) {
      if (!reducedMotion()) {
        el.querySelectorAll('[data-step]').forEach((n) => {
          const s = parseInt(n.getAttribute('data-step'), 10) || 1;
          if (s > fromStep && s <= toStep) n.classList.add('deck-anim');
        });
      }
      renderSlide(el, id, toStep, false);
    } else {
      // Undo builds: anything un-revealed loses its animation class, and a timer that was
      // revealed by an undone build and is still running is reset (re-reveal restarts it).
      const undone = Array.from(el.querySelectorAll('[data-step]')).filter((n) => {
        const s = parseInt(n.getAttribute('data-step'), 10) || 1;
        return s > toStep && s <= fromStep;
      });
      renderSlide(el, id, toStep, false);
      undone.forEach((n) => {
        n.classList.remove('deck-anim');
        n.querySelectorAll('.deck-anim').forEach((c) => c.classList.remove('deck-anim'));
      });
      el.querySelectorAll('[data-timer]').forEach((n) => {
        const t = live.timers[n.dataset.timerId];
        if (t && !t.stop && !isShown(n, el)) {
          delete live.timers[n.dataset.timerId];
          doneTimers.delete(n.dataset.timerId);
          renderTimer(n, false);
        }
      });
    }
    startRevealedTimers(cur.index);
  }

  function next(o) {
    if (black) { setBlack(false); return false; }
    const t = nextTarget();
    if (!t) return false;
    if (MODE === 'audience' && !live.clock.since && clockElapsed() === 0 && !(o && o.auto)) {
      // The first advance starts the talk clock. Leaving the opening slide, it counts that slide's own time in
      // (#deck-config "clockLead", seconds), so the checkpoints are not read early.
      if (cur.index === firstLinear() && +config.clockLead > 0) live.clock.acc = +config.clockLead * 1000;
      clockStart();
    }
    return go(t, { kind: (o && o.auto) ? 'auto' : t.kind });
  }

  function prev() {
    if (black) { setBlack(false); return false; }
    if (cur.step > 0) return go({ index: cur.index, step: cur.step - 1 }, { kind: 'step' });
    const h = live.history;
    const top = h[h.length - 1];
    if (top && hIndex(top) === cur.index && !top.linear && h.length > 1) {
      h.pop();
      while (h.length > 1 && hIndex(h[h.length - 1]) < 0) h.pop();
      const f = h[h.length - 1];
      const ti = hIndex(f);
      // back where the jump started, at the build that was left (older frames without a step: final state)
      if (ti >= 0) return go({ index: ti, step: f.step != null ? clamp(f.step | 0, 0, metas[ti].steps) : metas[ti].steps }, { kind: 'back', backward: true });
    }
    const j = linearPrev(cur.index);
    if (j < 0) return false;
    if (topIndex() === cur.index) h.pop();
    while (h.length && topIndex() !== j && isAutoFrame(h[h.length - 1])) h.pop();
    if (topIndex() !== j) h.push({ id: metas[j].id, linear: true });
    return go({ index: j, step: metas[j].steps }, { kind: 'back', backward: true });
  }

  function back() {
    const h = live.history;
    if (h.length && topIndex() === cur.index) h.pop();
    while (h.length && isAutoFrame(h[h.length - 1])) h.pop();
    const ti = topIndex();
    if (ti < 0) return prev();
    return go({ index: ti, step: metas[ti].steps }, { kind: 'back', backward: true });
  }

  function parseTarget(spec) {
    const s = String(spec || '').trim();
    const m = s.match(/^([^/]+?)(?:\/(\d+))?$/);
    if (!m) return null;
    let i = indexOfId(m[1]);
    if (i < 0 && /^\d+$/.test(m[1])) i = parseInt(m[1], 10) - 1;
    if (i < 0 || i >= metas.length) return null;
    return { index: i, step: clamp(parseInt(m[2] || '0', 10) || 0, 0, metas[i].steps) };
  }

  function jumpTo(n) {
    const i = (parseInt(n, 10) || 0) - 1;
    // An unused member slot keeps the numbers stable but is not part of the talk: typing its number does nothing.
    if (i < 0 || i >= metas.length || metas[i].unused) { toast('No slide ' + n); return false; }
    return go({ index: i, step: 0 }, { kind: 'jump' });
  }

  function chipEffects(i, chip) {
    if (!chip) return;
    let changed = applySet(chip.getAttribute('data-set'));
    if (chip.hasAttribute('data-stop-timer')) { stopTimers(i, chip.getAttribute('data-stop-timer')); changed = true; }
    return changed;
  }

  function doGoto(spec, chip) {
    if (black) setBlack(false);
    chipEffects(cur.index, chip);
    const s = String(spec || '').trim();
    if (s === '@back') return back();
    if (s === '@next') return next();
    if (s === '@prev') return prev();
    const t = parseTarget(s);
    if (!t) { console.warn('[deck] data-goto target "' + s + '" not found'); refresh(); return false; }
    if (t.index === cur.index && t.step === cur.step) { refresh(); return false; }
    return go(t, { kind: 'jump' });
  }

  function fire(i, chip) {
    if (!chip) return false;
    if (black) setBlack(false);
    const el = slides[i];
    const id = metas[i].id;
    const name = chip.getAttribute('data-trigger');
    const list = live.fired[id] || (live.fired[id] = []);
    const group = chip.getAttribute('data-trigger-group');
    if (group) {
      el.querySelectorAll('[data-trigger-group="' + esc(group) + '"]').forEach((o) => {
        const on = o.getAttribute('data-trigger');
        if (on !== name) {
          const k = list.indexOf(on);
          if (k >= 0) list.splice(k, 1);
        }
      });
    }
    const before = new Set(Array.from(el.querySelectorAll('[data-triggered].is-triggered')));
    if (!list.includes(name)) list.push(name);
    chipEffects(i, chip);
    renderSlide(el, id, i === cur.index ? cur.step : 0, false);
    if (!reducedMotion()) {
      el.querySelectorAll('[data-triggered].is-triggered').forEach((n) => { if (!before.has(n)) n.classList.add('deck-anim'); });
    }
    startRevealedTimers(i);
    emit('trigger', { slide: id, name });
    afterChange();
    return true;
  }

  function setBlack(on) {
    black = !!on;
    root.classList.toggle('deck-is-black', black);
    if (MODE === 'audience') {
      if (!black && metas[cur.index] && metas[cur.index].auto != null) afterShown(navToken);
      afterChange();
    }
  }

  function applyLit() {
    root.classList.toggle('deck-lit', !!live.lit);
  }

  /** Lit-room mode: a room condition, not a live outcome. Persisted and mirrored with the live state. */
  function setLit(on) {
    live.lit = !!on;
    applyLit();
    if (MODE === 'audience') {
      toast(live.lit ? 'Lit-room mode on' : 'Lit-room mode off');
      emit('lit', { on: live.lit });
      afterChange();
    }
    return true;
  }

  function resetLive() {
    const keepIndex = cur.index;
    const keepLit = live.lit;
    live = freshLive();
    live.lit = keepLit;
    live.history.push({ id: metas[keepIndex].id, linear: true });
    doneTimers.clear();
    slides.forEach((s) => stripAnim(s));
    showOnly(cur.index, false);
    toast('Live state reset');
    emit('reset', {});
    afterChange();
  }

  /* ----------------------------------------------------------- talk clock */

  function clockElapsed(c) {
    const k = c || live.clock;
    return (k.acc || 0) + (k.since ? Math.max(0, now() - k.since) : 0);
  }
  function clockStart() { if (!live.clock.since) live.clock.since = now(); }
  function clockPause() { if (live.clock.since) { live.clock = { acc: clockElapsed(), since: null }; } }
  function clockReset() { live.clock = { acc: 0, since: null }; live.reached = {}; }
  function clockSet(ms) { live.clock = { acc: Math.max(0, +ms || 0), since: live.clock.since ? now() : null }; }
  function clockOp(op, ms) {
    if (op === 'start') clockStart();
    else if (op === 'pause') clockPause();
    else if (op === 'toggle') { if (live.clock.since) clockPause(); else clockStart(); }
    else if (op === 'reset') clockReset();
    else if (op === 'set') clockSet(ms);
    afterChange();
  }
  function markReached() {
    const e = clockElapsed();
    if (e <= 0) return;
    // A Q&A backup (data-hidden="backup") sits after every checkpoint but is not progress through the talk:
    // one visit to the hub would otherwise mark every checkpoint as reached for the rest of the talk.
    if (metas[cur.index] && (metas[cur.index].hiddenKind === 'backup' || metas[cur.index].unused)) return;
    checkpoints.forEach((cp) => {
      if (live.reached[cp.slide] == null && cur.index >= cp.index) live.reached[cp.slide] = e;
    });
  }

  /* ------------------------------------------------------------ after move */

  function state() {
    const m = metas[cur.index] || {};
    return {
      index: cur.index,
      pos: cur.index + 1,
      id: m.id,
      step: cur.step,
      steps: m.steps,
      total: metas.length,
      hidden: !!m.hidden,
      title: m.title,
      folio: m.folio,
      black,
      lit: !!live.lit,
      mode: MODE,
    };
  }

  function writeHash() {
    if (MODE !== 'audience' || !metas[cur.index]) return;
    const h = '#' + encodeURIComponent(metas[cur.index].id) + (cur.step ? '/' + cur.step : '');
    if (location.hash !== h) {
      try { history.replaceState(history.state, '', h); } catch { location.hash = h; }
    }
  }

  function snapshot() {
    return {
      ns: NS,
      type: 'state',
      index: cur.index,
      step: cur.step,
      black,
      live: { store: live.store, timers: live.timers, fired: live.fired, clock: live.clock, reached: live.reached, lit: !!live.lit },
      at: now(),
    };
  }

  function broadcast() {
    if (MODE !== 'audience' || !presenterWin) return;
    if (presenterWin.closed) { presenterWin = null; return; }
    try { presenterWin.postMessage(snapshot(), '*'); } catch { /* window gone */ }
  }

  function afterChange() {
    if (MODE !== 'audience') return;
    markReached();
    writeHash();
    save();
    broadcast();
    emit('change', state());
  }

  /* ------------------------------------------------------------- scaling */

  function fit() {
    if (!stage) return;
    if (printing || MODE === 'print') {
      const forced = parseFloat(params.get('zoom'));
      const z = forced > 0 ? forced : Math.min(1, (root.clientWidth || window.innerWidth) / W);
      root.style.setProperty('--deck-print-zoom', String(z));
      stage.style.transform = '';
      return;
    }
    if (MODE === 'presenter') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = Math.min(w / W, h / H);
    const x = Math.round((w - W * s) / 2);
    const y = Math.round((h - H * s) / 2);
    stage.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + s + ')';
    root.style.setProperty('--deck-scale', s.toFixed(5));
  }

  /* -------------------------------------------------------------- print */

  // The order a click-through visits the visible slides: from the first one, Next at each slide's last build
  // (data-next, else the next visible slide). Visible slides no path reaches follow in physical order.
  function clickerOrder() {
    const out = [];
    const seen = new Set();
    let i = firstLinear();
    while (i >= 0 && i < metas.length && !seen.has(i)) {
      seen.add(i);
      if (!metas[i].hidden) out.push(i);
      const j = metas[i].next ? indexOfId(metas[i].next) : -1;
      i = j >= 0 ? j : linearNext(i);
    }
    metas.forEach((m, k) => { if (!m.hidden && !seen.has(k)) out.push(k); });
    return out;
  }

  /**
   * The static export plan (one entry per page / picture, in order):
   *   pdf   the main flow in clicker order (visible slides), then an appendix with the hidden variants and
   *         backups in physical order (each keeps its print tag); data-export decides membership
   *   pptx  physical order; hidden slides stay in place (the .pptx marks them hidden)
   *   all   every slide in physical order (review screenshots, layout checks)
   */
  function exportPlan(kind) {
    const k = EXPORT_KINDS.includes(kind) ? kind : 'pdf';
    const all = metas.map((m, i) => i);
    let idx;
    if (k === 'all') idx = all;
    else if (k === 'pptx') idx = all.filter((i) => metas[i].exports.includes('pptx'));
    else {
      idx = clickerOrder().filter((i) => metas[i].exports.includes('pdf'))
        .concat(all.filter((i) => metas[i].hidden && metas[i].exports.includes('pdf')));
    }
    return idx.map((i) => {
      const m = metas[i];
      const tag = m.el.querySelector(':scope > .deck-variant-tag');
      return { id: m.id, pos: m.pos, title: m.title, hidden: m.hidden, hiddenKind: m.hiddenKind, part: m.hidden ? 'appendix' : 'main', tag: tag ? tag.textContent : '' };
    });
  }

  // Print shows the static export: the planned slides in plan order (the DOM is reordered while printing and
  // restored afterwards), every other slide display:none (.deck-export-omit), no page break after the last one.
  function applyExportLayout(on) {
    slides.forEach((el) => el.classList.remove('deck-export-omit', 'deck-print-last'));
    if (!on) {
      if (reordered) { slides.forEach((el) => stage.appendChild(el)); reordered = false; }
      return;
    }
    const plan = exportPlan(PRINT_EXPORT);
    const keep = new Set(plan.map((p) => p.id));
    const order = plan.map((p) => slides[indexOfId(p.id)]);
    const inPhysicalOrder = order.every((el, i) => i === 0 || slides.indexOf(order[i - 1]) < slides.indexOf(el));
    if (!inPhysicalOrder) {
      order.forEach((el) => stage.appendChild(el));
      slides.forEach((el) => { if (!keep.has(el.id)) stage.appendChild(el); });
      reordered = true;
    }
    slides.forEach((el) => { if (!keep.has(el.id)) el.classList.add('deck-export-omit'); });
    if (order.length) order[order.length - 1].classList.add('deck-print-last');
  }

  function setPrinting(on) {
    if (on === printing && MODE !== 'print') return;
    printing = !!on;
    root.classList.toggle('deck-print', printing);
    if (printing) {
      finishTransitions();
      clearTimeout(autoTimer);
      setMorphNames(null);
      slides.forEach((el, i) => { stripAnim(el); renderSlide(el, metas[i].id, metas[i].steps, true); });
      applyExportLayout(true);
    } else {
      applyExportLayout(false);
      slides.forEach((el, i) => renderSlide(el, metas[i].id, i === cur.index ? cur.step : 0, false));
      showOnly(cur.index, false);
    }
    fit();
  }

  /* ------------------------------------------------------------------ UI */

  function el(tag, cls, text) {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const HELP = [
    ['→  ↓  PgDn  Space  Enter  click', 'next build / slide'],
    ['←  ↑  PgUp  Backspace', 'previous build / slide'],
    ['number + Enter', 'jump to slide n (incl. hidden)'],
    ['Home / End', 'first / last slide'],
    ['B  or  .', 'black screen on / off'],
    ['F', 'fullscreen'],
    ['P', 'presenter window'],
    ['L', 'lit-room mode on / off (flat, high contrast)'],
    ['Shift + R', 'reset live outcomes, timers and talk clock'],
    ['?  /  Esc', 'this help / close'],
  ];

  function buildUI() {
    const wrap = el('div', 'deck-ui');
    wrap.setAttribute('data-print', 'hide');
    ui.black = el('div', 'deck-black');
    ui.black.setAttribute('aria-hidden', 'true');
    ui.help = el('div', 'deck-help');
    ui.help.setAttribute('role', 'dialog');
    ui.help.setAttribute('aria-label', 'Keyboard help');
    const card = el('div', 'deck-help-card');
    card.appendChild(el('h2', null, 'Keys'));
    const dl = el('dl');
    HELP.forEach(([k, v]) => { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', null, v)); });
    card.appendChild(dl);
    card.appendChild(el('p', 'deck-help-foot', 'deck.js ' + VERSION + ' · ' + metas.length + ' slides · mode: ' + MODE));
    ui.help.appendChild(card);
    ui.jump = el('div', 'deck-jump');
    ui.jump.setAttribute('aria-live', 'polite');
    ui.toast = el('div', 'deck-toast');
    ui.toast.setAttribute('role', 'status');
    wrap.append(ui.black, ui.help, ui.jump, ui.toast);
    doc.body.appendChild(wrap);
    ui.wrap = wrap;
  }

  let toastTimer = 0;
  function toast(msg) {
    if (!ui.toast) return;
    ui.toast.textContent = msg;
    ui.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('is-on'), 1800);
  }

  function toggleHelp(on) {
    helpOpen = on == null ? !helpOpen : !!on;
    root.classList.toggle('deck-help-open', helpOpen);
  }

  function showJump() {
    if (!ui.jump) return;
    clearTimeout(jumpTimer);
    if (!jumpBuf) { ui.jump.classList.remove('is-on'); return; }
    const i = parseInt(jumpBuf, 10) - 1;
    const m = metas[i];
    // On the beamer (a presenter window is open) only the digits show: ids, flags and titles stay off the room's
    // screen. The presenter window, or a deck without one, shows the full target.
    const quiet = MODE === 'audience' && presenterWin && !presenterWin.closed;
    ui.jump.textContent = quiet ? '→ ' + jumpBuf
      : 'Go to ' + jumpBuf + (m && !m.unused ? ' · ' + m.id + (m.hidden ? ' (hidden)' : '') + ' · ' + m.title : ' · no such slide') + '  ⏎';
    ui.jump.classList.add('is-on');
    jumpTimer = setTimeout(clearJump, 4000);
  }
  function clearJump() { jumpBuf = ''; showJump(); }

  function toggleFullscreen(forceOn) {
    try {
      if (doc.fullscreenElement && !forceOn) { const p = doc.exitFullscreen(); if (p && p.catch) p.catch(noop); }
      else if (!doc.fullscreenElement && root.requestFullscreen) { const p = root.requestFullscreen(); if (p && p.catch) p.catch(noop); }
    } catch { /* not allowed */ }
  }

  /* ------------------------------------------------------- input routing */

  /** Run a command locally (audience) or send it to the deck window (presenter / embed). */
  function act(cmd) {
    if (MODE === 'audience') return runCmd(cmd);
    if (MODE === 'presenter') return sendToDeck(Object.assign({ ns: NS, type: 'cmd' }, cmd));
    if (MODE === 'embed') {
      try { window.parent.postMessage(Object.assign({ ns: NS, type: 'cmd', pane: PANE }, cmd), '*'); } catch { /* detached */ }
    }
    return false;
  }

  function runCmd(d) {
    switch (d.cmd) {
      case 'next': return next();
      case 'prev': return prev();
      case 'first': return go({ index: firstLinear(), step: 0 }, { kind: 'jump' });
      case 'last': return go({ index: lastLinear(), step: 0 }, { kind: 'jump' });
      case 'jump': return jumpTo(d.n);
      case 'go': { const t = parseTarget(d.target); return t ? go(t, { kind: 'jump' }) : false; }
      case 'black': return setBlack(d.value == null ? !black : !!d.value);
      case 'lit': return setLit(d.value == null ? !live.lit : !!d.value);
      case 'clock': return clockOp(d.op, d.ms);
      case 'reset': return resetLive();
      case 'goto':
      case 'trigger': {
        const i = indexOfId(d.slide);
        if (i < 0 || i !== cur.index) return false;
        if (d.cmd === 'goto') {
          const chip = slides[i].querySelector('[data-goto="' + esc(d.target) + '"]');
          return doGoto(d.target, chip);
        }
        const chip = slides[i].querySelector('[data-trigger="' + esc(d.name) + '"]');
        return fire(i, chip);
      }
      default: return false;
    }
  }

  function chipCmd(chip) {
    const id = metas[cur.index].id;
    if (chip.hasAttribute('data-goto')) return { cmd: 'goto', slide: id, target: chip.getAttribute('data-goto') };
    return { cmd: 'trigger', slide: id, name: chip.getAttribute('data-trigger') };
  }

  function activateChip(chip) {
    if (MODE === 'audience') {
      if (chip.hasAttribute('data-goto')) doGoto(chip.getAttribute('data-goto'), chip);
      else fire(cur.index, chip);
    } else {
      act(chipCmd(chip));
    }
  }

  function onKey(e) {
    if (e.defaultPrevented || e.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (MODE === 'embed') {
      // The presenter owns the keyboard; a focused preview pane just forwards keys to it.
      try { window.parent.postMessage({ ns: NS, type: 'key', key: e.key, shiftKey: e.shiftKey, pane: PANE }, '*'); } catch { /* detached */ }
      if (NEXT_KEYS.has(e.key) || PREV_KEYS.has(e.key) || /^[0-9]$/.test(e.key)) e.preventDefault();
      return;
    }
    const t = e.target;
    if (t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const k = e.key;
    if (helpOpen) {
      if (k !== 'Shift') { toggleHelp(false); e.preventDefault(); }
      return;
    }
    // Keyboard activation of a focused hotspot (mouse clicks blur, so clickers never land here).
    if ((k === 'Enter' || k === ' ') && t && t.closest && t.closest('[data-goto], [data-trigger]') && !jumpBuf) {
      e.preventDefault();
      activateChip(t.closest('[data-goto], [data-trigger]'));
      return;
    }
    if (/^[0-9]$/.test(k)) {
      jumpBuf = (jumpBuf + k).slice(-4);
      showJump();
      e.preventDefault();
      return;
    }
    if (jumpBuf) {
      if (k === 'Enter') {
        const n = parseInt(jumpBuf, 10);
        clearJump();
        e.preventDefault();
        // Report a bad number where it was typed: from the presenter it must not toast on the beamer.
        if (!metas[n - 1] || metas[n - 1].unused) toast('No slide ' + n);
        else act({ cmd: 'jump', n });
        return;
      }
      if (k === 'Backspace') { jumpBuf = jumpBuf.slice(0, -1); showJump(); e.preventDefault(); return; }
      if (k === 'Escape') { clearJump(); e.preventDefault(); return; }
      clearJump();
    }
    let handled = true;
    if (k === ' ' && e.shiftKey) act({ cmd: 'prev' });
    else if (NEXT_KEYS.has(k)) act({ cmd: 'next' });
    else if (PREV_KEYS.has(k)) act({ cmd: 'prev' });
    else if (k === 'Home') act({ cmd: 'first' });
    else if (k === 'End') act({ cmd: 'last' });
    else if (k === 'b' || k === 'B' || k === '.') act({ cmd: 'black' });
    else if (k === 'Escape') { if (MODE === 'audience' && black) setBlack(false); else handled = false; }
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'F5') toggleFullscreen(true);
    else if (k === '?') toggleHelp();
    else if ((k === 'p' || k === 'P') && MODE === 'audience') openPresenter();
    else if (k === 'l' || k === 'L') act({ cmd: 'lit' });
    else if (k === 'R' && e.shiftKey) {
      // Mid-talk (clock past 1:00) a single Shift+R would wipe the clock, stamps and outcomes: ask for a second press.
      const armed = resetArmedAt && now() - resetArmedAt < 3000;
      if (!armed && clockElapsed() > 60000) {
        resetArmedAt = now();
        toast('Press Shift+R again to reset the live state and the clock');
      } else {
        resetArmedAt = 0;
        act({ cmd: 'reset' });
      }
    }
    else handled = false;
    if (handled) e.preventDefault();
  }

  function onClick(e) {
    if (e.button !== 0 || e.defaultPrevented) return;
    if (helpOpen) { toggleHelp(false); return; }
    let t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
    if (!t) return;
    if (activeVT && (t === root || t === doc.body)) {
      // While a View Transition runs, its pseudo-element overlay takes every click (target <html>), so a
      // hotspot clicked during the morph would read as a click on the empty stage and advance instead.
      // Finish the transition, then hit-test the real DOM.
      finishTransitions();
      const hit = doc.elementFromPoint(e.clientX, e.clientY);
      if (hit) t = hit;
    }
    if (t.closest('.deck-ui') && !t.closest('.deck-black')) return;
    // The second click of a double-click on a hotspot is not a command of its own: it would advance (or hit
    // a hotspot on) the slide the first click just jumped to.
    const c = chipClick;
    if (e.detail > 1 && e.timeStamp - c.t < 1000 && Math.abs(e.clientX - c.x) <= 16 && Math.abs(e.clientY - c.y) <= 16) {
      e.preventDefault();
      return;
    }
    const chip = t.closest('[data-goto], [data-trigger]');
    if (chip && stage.contains(chip)) {
      e.preventDefault();
      if (chip.blur) chip.blur();
      chipClick = { t: e.timeStamp, x: e.clientX, y: e.clientY };
      // A hotspot on a slide that is no longer current (the incoming slide is not painted yet) is ignored.
      if (MODE === 'audience' && !slides[cur.index].contains(chip)) return;
      activateChip(chip);
      return;
    }
    if (t.closest('a[href], button, input, select, textarea, label, summary, [contenteditable], [data-no-advance]')) return;
    // #deck-config "clickAdvance": false: only hotspots react to the mouse; a near miss never reveals a build.
    // (A click on the black screen still lifts it.)
    if (config.clickAdvance === false && !t.closest('.deck-black')) return;
    const sel = window.getSelection ? String(window.getSelection()) : '';
    if (sel) return;
    act({ cmd: 'next' });
  }

  function onAnimEnd(e) {
    if (e.animationName && e.animationName.indexOf('deck-') === 0 && e.target.classList) e.target.classList.remove('deck-anim');
  }

  function onHash() {
    if (MODE !== 'audience') return;
    const t = parseTarget(safeDecode(location.hash.replace(/^#/, '')));
    if (!t || (t.index === cur.index && t.step === cur.step)) return;
    go(t, { kind: 'jump' });
  }

  /* ---------------------------------------------------- window messaging */

  function openPresenter() {
    if (presenterWin && !presenterWin.closed) { try { presenterWin.focus(); } catch { /* ignore */ } return presenterWin; }
    const base = location.href.split('#')[0];
    const url = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'presenter';
    let w = null;
    try { w = window.open(url, 'deck-presenter', 'popup,width=1280,height=800'); } catch { w = null; }
    if (!w) { toast('Pop-up blocked: allow pop-ups to open the presenter window'); return null; }
    presenterWin = w;
    return w;
  }

  function onAudienceMessage(e) {
    const d = e.data;
    if (!d || d.ns !== NS || !e.source || e.source === window) return;
    if (d.type !== 'hello' && d.type !== 'cmd') return;
    presenterWin = e.source;
    if (d.type === 'cmd') runCmd(d);
    broadcast();
  }

  function sendToDeck(msg) {
    const o = window.opener;
    if (!o || o.closed) { toast('Not connected: open the presenter view with P from the deck window'); return false; }
    try { o.postMessage(msg, '*'); return true; } catch { return false; }
  }

  /** Mirror modes (presenter, embed): adopt a state snapshot from the deck window. */
  function applyMirror(d) {
    live = adoptLive(d.live);
    black = !!d.black;
    applyLit();
    const index = clamp(d.index | 0, 0, slides.length - 1);
    const step = clamp(d.step | 0, 0, metas[index].steps);
    const sig = index + '/' + step + '/' + JSON.stringify([live.store, live.fired, live.timers]);
    cur = { index, step };
    if (sig !== mirrorSig || shownIndex !== index) {
      mirrorSig = sig;
      showOnly(index, false);
    }
  }

  /* --------------------------------------------------------- presenter UI */

  function setupPresenter() {
    doc.title = 'Presenter · ' + (doc.title || 'Deck');
    const base = location.href.split('#')[0].split('?')[0];
    const p = el('div', 'deck-presenter');
    p.setAttribute('data-print', 'hide');

    const bar = el('header', 'dp-bar');
    const clock = el('div', 'dp-clock');
    ui.elapsed = el('span', 'dp-elapsed', '0:00');
    ui.elapsed.setAttribute('aria-label', 'Elapsed talk time');
    ui.toggle = el('button', 'dp-btn', 'Start');
    ui.toggle.type = 'button';
    ui.toggle.dataset.dp = 'toggle';
    ui.reset = el('button', 'dp-btn', 'Reset');
    ui.reset.type = 'button';
    ui.reset.dataset.dp = 'reset';
    clock.append(ui.elapsed, ui.toggle);
    const pos = el('div', 'dp-pos');
    ui.slideNo = el('span', 'dp-slide', 'Slide –');
    ui.build = el('span', 'dp-build', 'Build –');
    ui.flags = el('span', 'dp-flags', '');
    pos.append(ui.slideNo, ui.build, ui.flags);
    ui.wall = el('span', 'dp-wall', '');
    ui.conn = el('span', 'dp-conn', 'Waiting for the deck window…');
    bar.append(clock, pos, ui.wall, ui.conn, ui.reset);

    const main = el('main', 'dp-main');
    const curSec = el('section', 'dp-current');
    curSec.appendChild(el('h2', null, 'Current'));
    const curFrameWrap = el('div', 'dp-frame');
    ui.curFrame = el('iframe');
    ui.curFrame.title = 'Current slide';
    ui.curFrame.src = base + '?embed=current';
    curFrameWrap.appendChild(ui.curFrame);
    ui.curTitle = el('p', 'dp-caption', '');
    curSec.append(curFrameWrap, ui.curTitle);

    const side = el('aside', 'dp-side');
    const nextSec = el('section', 'dp-next');
    nextSec.appendChild(el('h2', null, 'Next'));
    const nextFrameWrap = el('div', 'dp-frame dp-frame-next');
    ui.nextFrame = el('iframe');
    ui.nextFrame.title = 'Next slide preview';
    ui.nextFrame.tabIndex = -1;
    ui.nextFrame.src = base + '?embed=next';
    nextFrameWrap.appendChild(ui.nextFrame);
    ui.nextLabel = el('p', 'dp-caption', '');
    nextSec.append(nextFrameWrap, ui.nextLabel);

    const cpSec = el('section', 'dp-checkpoints');
    cpSec.appendChild(el('h2', null, 'Checkpoints'));
    ui.cpList = el('ol', 'dp-cp-list');
    ui.cpItems = checkpoints.map((cp) => {
      const li = el('li', 'dp-cp');
      li.dataset.slide = cp.slide;
      const name = el('span', 'dp-cp-name', metas[cp.index].id + (cp.label ? ' · ' + cp.label : '') + ' by ' + fmt(cp.by));
      const st = el('span', 'dp-cp-status', '');
      li.append(name, st);
      ui.cpList.appendChild(li);
      return { cp, li, st };
    });
    if (!checkpoints.length) ui.cpList.appendChild(el('li', 'dp-cp dp-cp-empty', 'No checkpoints configured'));
    cpSec.appendChild(ui.cpList);

    const nav = el('section', 'dp-nav');
    [['prev', '◀ Prev'], ['next', 'Next ▶'], ['black', 'Black'], ['lit', 'Lit room']].forEach(([cmd, label]) => {
      const b = el('button', 'dp-btn', label);
      b.type = 'button';
      b.dataset.dp = cmd;
      nav.appendChild(b);
    });
    side.append(nextSec, cpSec, nav);
    main.append(curSec, side);
    p.append(bar, main);
    doc.body.appendChild(p);

    p.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-dp]');
      if (!b) return;
      e.preventDefault();
      b.blur();
      const c = b.dataset.dp;
      if (c === 'toggle') act({ cmd: 'clock', op: 'toggle' });
      else if (c === 'reset') {
        // two clicks within 3 s: a stray click next to Pause must not wipe the checkpoint clock
        clearTimeout(resetBtnTimer);
        if (b.dataset.armed) {
          delete b.dataset.armed;
          b.textContent = 'Reset';
          act({ cmd: 'clock', op: 'reset' });
        } else {
          b.dataset.armed = '1';
          b.textContent = 'Reset? click again';
          resetBtnTimer = setTimeout(() => { delete b.dataset.armed; b.textContent = 'Reset'; }, 3000);
        }
      }
      else act({ cmd: c });
    });

    window.addEventListener('message', onPresenterMessage);
    const hello = () => { if (window.opener && !window.opener.closed) sendToDeck({ ns: NS, type: 'hello' }); };
    hello();
    setInterval(hello, 1000);
    setInterval(presenterTick, 250);
    presenterTick();
  }

  /** What the room sees after the next press: an auto bridge (data-auto) moves on by itself, so look past it. */
  function previewTarget(c) {
    const t = nextTarget(c);
    if (t && t.index !== c.index && metas[t.index].auto != null) {
      const t2 = nextTarget({ index: t.index, step: metas[t.index].steps });
      if (t2) return Object.assign({}, t2, { viaAuto: true });
    }
    return t;
  }

  function paneState(pane) {
    if (!lastRemote) return null;
    if (pane === 'next') {
      const t = previewTarget({ index: lastRemote.index, step: lastRemote.step });
      if (!t) return Object.assign({}, lastRemote, { end: true });
      return Object.assign({}, lastRemote, { index: t.index, step: t.step });
    }
    return lastRemote;
  }

  function postPane(frame, pane) {
    const s = paneState(pane);
    if (!s || !frame || !frame.contentWindow) return;
    try { frame.contentWindow.postMessage(Object.assign({}, s, { ns: NS, type: 'state', pane }), '*'); } catch { /* not loaded */ }
  }

  function onPresenterMessage(e) {
    const d = e.data;
    if (!d || d.ns !== NS) return;
    if (e.source && e.source === window.opener && d.type === 'state') {
      lastRemote = d;
      lastRemoteAt = now();
      applyMirror(d);
      renderPresenter();
      postPane(ui.curFrame, 'current');
      postPane(ui.nextFrame, 'next');
      return;
    }
    const fromCur = ui.curFrame && e.source === ui.curFrame.contentWindow;
    const fromNext = ui.nextFrame && e.source === ui.nextFrame.contentWindow;
    if (!fromCur && !fromNext) return;
    if (d.type === 'hello') postPane(fromCur ? ui.curFrame : ui.nextFrame, fromCur ? 'current' : 'next');
    else if (d.type === 'cmd' && fromCur) {
      const c = Object.assign({}, d);
      delete c.pane;
      sendToDeck(c);
    } else if (d.type === 'key' && typeof d.key === 'string') {
      onKey(new KeyboardEvent('keydown', { key: d.key, shiftKey: !!d.shiftKey, cancelable: true }));
    }
  }

  function renderPresenter() {
    const m = metas[cur.index];
    if (!m) return;
    ui.slideNo.textContent = 'Slide ' + m.pos + ' / ' + metas.length + ' · ' + m.id;
    ui.build.textContent = 'Build ' + cur.step + ' / ' + m.steps;
    const flags = [];
    if (m.hidden) flags.push('hidden');
    if (m.auto != null) flags.push('auto');
    if (black) flags.push('BLACK');
    if (live.lit) flags.push('LIT');
    ui.flags.textContent = flags.join(' · ');
    root.classList.toggle('deck-remote-black', black);
    ui.curTitle.textContent = m.title;
    const t = previewTarget(cur);
    if (!t) ui.nextLabel.textContent = 'End of deck';
    else if (t.index === cur.index) ui.nextLabel.textContent = 'Next build ' + t.step + ' / ' + m.steps + ' on this slide';
    else {
      const n = metas[t.index];
      ui.nextLabel.textContent = 'Slide ' + n.pos + ' · ' + n.id + (n.hidden ? ' (hidden)' : '') + ' · ' + n.title + (t.viaAuto ? ' (after the auto bridge)' : '');
    }
    root.classList.toggle('dp-at-end', !t);
  }

  function cpStatus(cp, elapsed) {
    const by = cp.by * 1000;
    const tol = (config.lateTolerance != null ? +config.lateTolerance : 20) * 1000;
    const r = live.reached[cp.slide];
    if (r != null) {
      const d = r - by;
      if (d <= 0) return { state: 'ahead', text: '✓ ' + fmt(r / 1000) + ' · ' + fmt(-d / 1000) + ' ahead' };
      return { state: d > tol ? 'behind' : 'late', text: '✓ ' + fmt(r / 1000) + ' · ' + fmt(d / 1000) + ' behind' };
    }
    if (elapsed > by) return { state: 'behind', text: fmt((elapsed - by) / 1000) + ' behind' };
    return { state: 'pending', text: 'due in ' + fmt((by - elapsed) / 1000) };
  }

  function presenterTick() {
    const connected = !!lastRemote && now() - lastRemoteAt < 3500 && window.opener && !window.opener.closed;
    ui.conn.textContent = connected ? 'Connected' : (window.opener ? 'Waiting for the deck window…' : 'Not connected: open with P from the deck');
    root.classList.toggle('dp-connected', connected);
    const e = clockElapsed();
    ui.elapsed.textContent = fmt(e / 1000);
    ui.toggle.textContent = live.clock.since ? 'Pause' : (e > 0 ? 'Resume' : 'Start');
    root.classList.toggle('dp-running', !!live.clock.since);
    const d = new Date();
    ui.wall.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    let nextMarked = false;
    ui.cpItems.forEach(({ cp, li, st }) => {
      const s = cpStatus(cp, e);
      if (st.textContent !== s.text) st.textContent = s.text;
      li.dataset.state = s.state;
      const isNext = !nextMarked && live.reached[cp.slide] == null;
      if (isNext) nextMarked = true;
      li.classList.toggle('is-next', isNext);
    });
  }

  /* ------------------------------------------------------------ the ticker */

  function tick() {
    if (printing || !slides.length || MODE === 'presenter') return;
    const i = MODE === 'audience' ? cur.index : shownIndex;
    const s = slides[i];
    if (s) s.querySelectorAll('[data-timer]').forEach((n) => renderTimer(n, false));
  }

  /* -------------------------------------------------------------- startup */

  function finishInit() {
    const fonts = doc.fonts && doc.fonts.ready ? doc.fonts.ready.catch(noop) : Promise.resolve();
    const frame = new Promise((r) => {
      let done = false;
      const fin = () => { if (!done) { done = true; r(); } };
      requestAnimationFrame(() => requestAnimationFrame(fin));
      setTimeout(fin, 150);
    });
    Promise.all([fonts, frame]).then(() => {
      isReady = true;
      root.setAttribute('data-deck-ready', 'true');
      readyResolve(api);
      emit('ready', state());
    });
  }

  function init() {
    config = readConfig();
    collect();
    prepare();
    root.classList.add('deck-js', 'deck-mode-' + MODE);
    if (PAPER) root.classList.add('deck-paper');
    if (!metas.length) { console.warn('[deck] no <section class="slide"> found'); finishInit(); return; }

    if (MODE === 'print') {
      setPrinting(true);
      window.addEventListener('resize', fit);
      finishInit();
      return;
    }

    buildUI();
    window.addEventListener('resize', fit);
    stage.addEventListener('animationend', onAnimEnd);

    if (MODE === 'audience') {
      const saved = load();
      if (saved) live = adoptLive(saved.live);
      if (LIT_PARAM != null) live.lit = LIT_PARAM;
      applyLit();
      let start = parseTarget(rawHash);
      if (!start && saved && saved.cur && metas[saved.cur.index]) start = { index: saved.cur.index, step: clamp(saved.cur.step | 0, 0, metas[saved.cur.index].steps) };
      if (!start) start = { index: firstLinear(), step: 0 };
      cur = start;
      if (topIndex() !== cur.index) live.history.push({ id: metas[cur.index].id, linear: true });
      showOnly(cur.index, false);
      lastTransition = 'instant';
      fit();
      doc.addEventListener('keydown', onKey);
      doc.addEventListener('click', onClick);
      window.addEventListener('hashchange', onHash);
      window.addEventListener('message', onAudienceMessage);
      window.addEventListener('beforeprint', () => setPrinting(true));
      window.addEventListener('afterprint', () => setPrinting(false));
      afterChange();
      afterShown(navToken);
    } else if (MODE === 'embed') {
      if (LIT_PARAM != null) { live.lit = LIT_PARAM; applyLit(); }
      showOnly(0, false);
      fit();
      doc.addEventListener('keydown', onKey);
      doc.addEventListener('click', onClick);
      window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.ns !== NS || e.source !== window.parent || d.type !== 'state') return;
        root.classList.toggle('deck-embed-end', !!d.end);
        applyMirror(d);
      });
      try { window.parent.postMessage({ ns: NS, type: 'hello', pane: PANE }, '*'); } catch { /* standalone */ }
    } else if (MODE === 'presenter') {
      showOnly(0, false);
      doc.addEventListener('keydown', onKey);
      setupPresenter();
    }
    setInterval(tick, 200);
    finishInit();
  }

  /* ------------------------------------------------------------------- API */

  const api = {
    version: VERSION,
    mode: MODE,
    get ready() { return ready; },
    get isReady() { return isReady; },
    get lastTransition() { return lastTransition; },
    get slides() {
      return metas.map((m) => ({ id: m.id, pos: m.pos, folio: m.folio, steps: m.steps, hidden: m.hidden, hiddenKind: m.hiddenKind, unused: m.unused, auto: m.auto, next: m.next, transition: m.transition, title: m.title, exports: m.exports.slice() }));
    },
    exportPlan: (kind) => exportPlan(kind),
    get printExport() { return PRINT_EXPORT; },
    get checkpoints() { return checkpoints.map((c) => ({ slide: c.slide, by: c.by, label: c.label })); },
    state,
    next: () => act({ cmd: 'next' }),
    prev: () => act({ cmd: 'prev' }),
    first: () => act({ cmd: 'first' }),
    last: () => act({ cmd: 'last' }),
    go: (target, step) => act({ cmd: 'go', target: step != null ? target + '/' + step : String(target) }),
    jump: (n) => act({ cmd: 'jump', n }),
    black: (on) => act({ cmd: 'black', value: on }),
    lit: (on) => act({ cmd: 'lit', value: on }),
    get isLit() { return !!live.lit; },
    get paper() { return PAPER; },
    trigger: (name) => act({ cmd: 'trigger', slide: metas[cur.index] && metas[cur.index].id, name }),
    store: {
      get: storeGet,
      set: (k, v) => { storeSet(k, v); },
      all: () => Object.assign({}, live.store),
    },
    timers: () => {
      const out = {};
      Object.keys(live.timers).forEach((id) => {
        const t = live.timers[id];
        out[id] = { start: t.start, stop: t.stop, elapsed: ((t.stop || now()) - t.start) / 1000, running: !t.stop };
      });
      return out;
    },
    clock: {
      start: () => act({ cmd: 'clock', op: 'start' }),
      pause: () => act({ cmd: 'clock', op: 'pause' }),
      toggle: () => act({ cmd: 'clock', op: 'toggle' }),
      reset: () => act({ cmd: 'clock', op: 'reset' }),
      set: (ms) => act({ cmd: 'clock', op: 'set', ms }),
      elapsed: () => clockElapsed(),
      reached: () => Object.assign({}, live.reached),
    },
    history: () => live.history.map((h) => ({ id: h.id, linear: h.linear })),
    reset: () => act({ cmd: 'reset' }),
    help: (on) => toggleHelp(on),
    presenter: () => openPresenter(),
    print: (on) => setPrinting(on == null ? !printing : on),
    on(name, fn) { (handlers[name] || (handlers[name] = [])).push(fn); return () => api.off(name, fn); },
    off(name, fn) { const l = handlers[name]; if (l) { const k = l.indexOf(fn); if (k >= 0) l.splice(k, 1); } },
  };
  window.Deck = api;

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
