/*
 * axis.cjs: render the Deciding axis (rail, country dots + labels, bell curves, S01 tiles) as static
 * HTML from slides/src/data/countries.json. Used by tools/assemble.cjs for the directive
 *
 *   <!--@axis {"preset":"map","set":"fig53","static":["se","nl","de","us","jp","cn"],"step":1,"bells":2}-->
 *
 * Options (all optional):
 *   preset   "title" | "rails" | "map" | "room" | "strip"   geometry from countries.json presets (default "map")
 *   x0, x1, y, rowUp, rowLo                               override the preset geometry (stage px)
 *   set      "fig53" (default) | "cm2022"                 which position set
 *   show     ["se", …]   countries to render (default: all of the set; [] = none)
 *   static   ["se", …]   countries present from the start (default: all shown ones)
 *   step     n           build step for the non-static countries (default 1)
 *   stagger  ms          delay between non-static countries, revealed from both ends inward (default 150)
 *   labels   true | false | "below"     label placement (default true = the book's two rows)
 *   ghost    ["kr", …] | true            grey ghost style for these countries (S15: all)
 *   bells    false | true | n            bell curves (n = build step); bellDir "up" | "down"; bellAmp px; bellSigma px
 *                                         "down" keeps every curve clear of the labels (S08a must-fix); the
 *                                         end labels then move under the curves
 *   morph    true (default) | false       data-morph keys: rail "axis-dec", countries "dot-<k>"
 *   prefix   "dot-"                       morph key prefix for countries
 *   ends     true | false | ["L", "R"]    end labels (default "Consensual" / "Top-down"; preset may turn them off)
 *   rail     "axis-dec"                   morph key of the rail (S07's Leading rail: "axis-lead")
 *   kind     "dec" (default) | "lead"     "lead" draws the neutral Leading rail (Egalitarian ↔ Hierarchical)
 *   points   [{ "k":"us","name":"US","f":0.3,"row":"up" }, …]   positions NOT from the data file (S07's
 *            Leading dots, placed by eye from the Country Mapping): the slide must say so in its source line
 *   tiles    {"mu":"de","ny":"us"}        S01 slivers standing on the axis at those countries (keys tile-mu, tile-ny)
 *   class    "extra classes"              on the .dax layer
 *   id       "s08a-axis"                  id on the .dax layer
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA = path.resolve(__dirname, '..', '..', 'slides', 'src', 'data', 'countries.json');

function loadData(file) {
  return JSON.parse(fs.readFileSync(file || DATA, 'utf8'));
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mix(data, f) {
  const c = data.colors;
  const [a, b, t] = f < 0.5 ? [c.teal, c.grey, f / 0.5] : [c.grey, c.amber, (f - 0.5) / 0.5];
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function num(n) {
  return String(Math.round(n * 10) / 10);
}

function renderAxis(opts, dataIn) {
  const o = opts || {};
  const data = dataIn || loadData();
  const presetName = o.preset || 'map';
  const preset = data.presets[presetName];
  if (!preset) throw new Error('axis: unknown preset "' + presetName + '"');
  const g = Object.assign({}, preset, ['x0', 'x1', 'y', 'rowUp', 'rowLo'].reduce((a, k) => (o[k] != null ? Object.assign(a, { [k]: +o[k] }) : a), {}));
  const setName = o.set || 'fig53';
  const set = data.sets[setName];
  if (!set) throw new Error('axis: unknown set "' + setName + '"');
  const all = (o.points || set.countries).slice().sort((a, b) => a.f - b.f);
  const byKey = new Map(all.map((c) => [c.k, c]));
  const show = (o.show ? o.show : all.map((c) => c.k));
  show.forEach((k) => { if (!byKey.has(k)) throw new Error('axis: country "' + k + '" is not in set ' + setName); });
  const shown = all.filter((c) => show.includes(c.k));
  const statics = new Set(o.static ? o.static : shown.map((c) => c.k));
  const step = o.step != null ? +o.step : 1;
  const stagger = o.stagger != null ? +o.stagger : 150;
  const morph = o.morph !== false;
  const prefix = o.prefix || 'dot-';
  const ghost = o.ghost === true ? new Set(shown.map((c) => c.k)) : new Set(o.ghost || []);
  const labels = o.labels == null ? true : o.labels;
  const ends = o.ends != null ? o.ends : (preset.ends != null ? !!preset.ends : true);
  const lead = o.kind === 'lead';
  const endText = Array.isArray(ends) ? ends : (lead ? ['Egalitarian', 'Hierarchical'] : ['Consensual', 'Top-down']);
  const dx = g.x1 - g.x0;

  // non-static countries are revealed from both ends inward (the S08a stagger)
  const rest = shown.filter((c) => !statics.has(c.k));
  const order = [];
  for (let l = 0, r = rest.length - 1; l <= r; l++, r--) {
    order.push(rest[r]);
    if (l !== r) order.push(rest[l]);
  }
  const delay = new Map(order.map((c, i) => [c.k, Math.floor(i / 2) * stagger]));

  const cls = ['dax', 'dax--' + presetName];
  if (lead) cls.push('dax--lead');
  if (preset.thin) cls.push('dax--thin');
  if (o.class) cls.push(o.class);
  const style = ['--x0:' + g.x0 + 'px', '--x1:' + g.x1 + 'px', '--y:' + g.y + 'px'];
  if (g.rowUp) style.push('--row-up:' + g.rowUp + 'px');
  if (g.rowLo) style.push('--row-lo:' + g.rowLo + 'px');
  if (preset.endSize) style.push('--fs-end:' + preset.endSize + 'px');
  // bells hanging below the rail: the end labels move under the bells
  if (o.bells && o.bellDir === 'down') style.push('--end-dy:' + Math.round((o.bellAmp != null ? +o.bellAmp : 270) + 24) + 'px');
  const out = [];
  out.push('<div' + (o.id ? ' id="' + esc(o.id) + '"' : '') + ' class="' + cls.join(' ') + '" style="' + style.join(';') + '" data-axis="' + (o.points ? 'custom' : setName) + '" aria-hidden="true">');

  if (o.bells) {
    const sig = o.bellSigma != null ? +o.bellSigma : dx * 0.0565;
    const amp = o.bellAmp != null ? +o.bellAmp : 270;
    const dir = o.bellDir === 'down' ? 1 : -1;
    const bellStep = o.bells === true ? null : +o.bells;
    out.push('  <svg class="dax-bells dax-bells--' + (dir > 0 ? 'down' : 'up') + '" viewBox="0 0 1920 1080">');
    const mid = (shown.length - 1) / 2;
    shown.forEach((c, i) => {
      const cx = g.x0 + c.f * dx;
      const pts = [];
      const N = 40;
      for (let j = 0; j <= N; j++) {
        const x = cx - 2.8 * sig + j * (5.6 * sig / N);
        const y = g.y + dir * amp * Math.exp(-((x - cx) ** 2) / (2 * sig * sig));
        pts.push(num(x) + ' ' + num(y));
      }
      const attrs = bellStep != null ? ' data-step="' + bellStep + '" data-build="bell" data-delay="' + Math.round(Math.abs(i - mid) * 55) + '"' : '';
      out.push('    <path class="dax-bell"' + attrs + ' style="--c:' + mix(data, c.f) + '" d="M' + pts.join(' L') + ' Z"/>');
    });
    out.push('  </svg>');
  }

  out.push('  <div class="dax-rail"' + (morph ? ' data-morph="' + esc(o.rail || (lead ? 'axis-lead' : 'axis-dec')) + '"' : '') + '></div>');
  if (ends) {
    out.push('  <span class="dax-end dax-end--l">' + esc(endText[0]) + '</span>');
    out.push('  <span class="dax-end dax-end--r">' + esc(endText[1]) + '</span>');
  }
  if (o.tiles) {
    Object.keys(o.tiles).forEach((name) => {
      const c = byKey.get(o.tiles[name]);
      if (!c) throw new Error('axis: tile "' + name + '" refers to unknown country ' + o.tiles[name]);
      out.push('  <span class="dax-tile vt-grow" data-morph="tile-' + esc(name) + '" style="--f:' + c.f + '"></span>');
    });
  }
  shown.forEach((c) => {
    const row = labels === 'below' ? 'dax-below' : (c.row === 'lo' ? 'dax-lo' : 'dax-up');
    const k = ['dax-c', row, 'dax-' + c.k];
    if (ghost.has(c.k)) k.push('dax-ghost');
    let attrs = ' class="' + k.join(' ') + '"';
    if (morph) attrs += ' data-morph="' + prefix + c.k + '"';
    if (!statics.has(c.k)) attrs += ' data-step="' + step + '" data-build="rise" data-delay="' + delay.get(c.k) + '"';
    attrs += ' style="--f:' + c.f + '"';
    out.push('  <div' + attrs + '><i class="dax-dot"></i>' + (labels ? '<span class="dax-lab" data-fixed-text>' + esc(c.name) + '</span>' : '') + '</div>');
  });
  out.push('</div>');
  return out.join('\n');
}

module.exports = { renderAxis, loadData, DATA };

if (require.main === module) {
  // node tools/lib/axis.cjs '{"preset":"map","bells":2}'  prints the markup (for a quick look)
  process.stdout.write(renderAxis(JSON.parse(process.argv[2] || '{}')) + '\n');
}
