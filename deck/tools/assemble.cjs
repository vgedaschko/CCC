#!/usr/bin/env node
/*
 * assemble.cjs: build the deck HTML from slides/src (template + one partial pair per group).
 *
 *   node tools/assemble.cjs                         -> slides/big-d.html (the integrator's output)
 *   node tools/assemble.cjs --out slides/.tmp-g3.html   a private copy for one builder (gitignored)
 *   node tools/assemble.cjs --list                  print the slide order with owners and exit
 *   node tools/assemble.cjs --presenters 3 --out slides/.tmp-team3.html   override the team size of the manifest
 *   node tools/assemble.cjs --option nemawashi=on --out slides/.tmp-nema.html   override a team option for one build
 *
 * Sources (slides/src/):
 *   deck.template.html   head, config, sprite, <div id="stage">; markers <!-- @@GROUP-STYLES --> and <!-- @@SLIDES -->
 *   manifest.json        { "presenters": 2, "groups": [{ "file": "03-g3-per", "owner": "g3-per" }, …], "order": ["s01", …] }
 *   NN-group.html        only <section class="slide" id="…"> elements (comments allowed between them)
 *   NN-group.css         styles scoped to that group's slide ids
 * The manifest's "order" places every slide; a group file may hold its slides in any order.
 * Directives inside a slide are expanded here:  <!--@axis {json}-->  (tools/lib/axis.cjs).
 *
 * Team size ("change one number": manifest "presenters", or --presenters N):
 *   data-member="k" on an element   the element belongs to member k: removed from the output when k > N
 *                                   (dots, labels, rings, the k-th name on the title slide, …)
 *   data-member="k" on a <section>  member k's own slide (a slot): with k > N it stays in place (the physical
 *                                   numbers do not shift) but becomes data-hidden="unused": skipped by Next,
 *                                   no folio, left out of the PDF and the PPTX (engine/deck.js, static export)
 *   <html data-presenters="N" class="team-N">  for CSS that re-spaces a layout for the team size
 *
 * Static exports: manifest "export": { "s20e": "pptx" } sets data-export on that slide (engine: which static
 * exports carry it: "pdf", "pptx", "pdf pptx" or "none").
 *
 * Team options (manifest "options": { "nemawashi": false }, or --option name=on|off):
 *   data-option="name" on an element  kept only while the option is on (e.g. the S11D "our nemawashi" chip and its
 *                                   card exist only if the team really held its December talks); otherwise removed
 *   <html data-options="a b">          the options that are on (empty when none), for tests and CSS
 *
 * Safe in parallel: reads only, writes one output file atomically (temp file + rename).
 * The output must live directly in deck/slides/ so that the template's relative URLs resolve.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { renderAxis, loadData } = require('./lib/axis.cjs');

const DECK = path.resolve(__dirname, '..');
const SLIDES = path.join(DECK, 'slides');
const SRC = path.join(SLIDES, 'src');

function fail(msg) {
  console.error('assemble: ' + msg);
  process.exit(1);
}

/** Split a partial into its top-level <section> elements (nested sections are kept inside their slide). */
function splitSections(html, file) {
  const sections = [];
  const re = /<!--[\s\S]*?-->|<section\b[^>]*>|<\/section\s*>/gi;
  let depth = 0;
  let start = -1;
  let last = 0;
  let m;
  const stray = [];
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (tok.startsWith('<!--')) continue;
    if (/^<section/i.test(tok)) {
      if (depth === 0) {
        stray.push(html.slice(last, m.index));
        start = m.index;
      }
      depth += 1;
    } else {
      depth -= 1;
      if (depth < 0) fail(file + ': unbalanced </section>');
      if (depth === 0) {
        sections.push(html.slice(start, re.lastIndex));
        last = re.lastIndex;
      }
    }
  }
  if (depth !== 0) fail(file + ': unclosed <section>');
  stray.push(html.slice(last));
  const junk = stray.join('').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (junk) fail(file + ': only <section class="slide"> elements and comments are allowed at the top level; found: ' + junk.slice(0, 120));
  return sections.map((s) => {
    const open = s.match(/^<section\b[^>]*>/i)[0];
    const id = (open.match(/\bid\s*=\s*"([^"]+)"/i) || [])[1];
    if (!id) fail(file + ': a <section> without id: ' + open);
    if (!/\bclass\s*=\s*"[^"]*\bslide\b/i.test(open)) fail(file + ': #' + id + ' is missing class="slide"');
    return { id, html: s };
  });
}

function expandDirectives(html, where, data) {
  return html.replace(/<!--@(\w+)\s+([\s\S]*?)-->/g, (m, name, json) => {
    let opts;
    try { opts = JSON.parse(json); } catch (e) { fail(where + ': bad JSON in <!--@' + name + '-->: ' + e.message); }
    if (name === 'axis') {
      try { return renderAxis(opts, data); } catch (e) { fail(where + ': ' + e.message); }
    }
    fail(where + ': unknown directive @' + name);
    return m;
  });
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Ranges [start, end) of the HTML comments in html (markup inside them is not touched). */
function commentRanges(html) {
  const out = [];
  const re = /<!--[\s\S]*?-->/g;
  let m;
  while ((m = re.exec(html))) out.push([m.index, re.lastIndex]);
  return out;
}

/**
 * Removes every element (never a <section>) that carries attr="value" with drop(value) true.
 * An element that sits alone on its line(s) takes its line with it, so no blank lines are left behind.
 */
function dropElements(html, attr, drop, where) {
  let out = html;
  let from = 0;
  for (;;) {
    const comments = commentRanges(out);
    const inComment = (i) => comments.some(([a, b]) => i >= a && i < b);
    const re = new RegExp('<([a-zA-Z][\\w-]*)\\b[^>]*?\\s' + attr + '\\s*=\\s*"([^"]*)"[^>]*>', 'g');
    re.lastIndex = from;
    let m;
    while ((m = re.exec(out)) && (inComment(m.index) || /^section$/i.test(m[1]) || !drop(m[2]))) { /* keep looking */ }
    if (!m) return out;
    const tag = m[1].toLowerCase();
    let start = m.index;
    let end = re.lastIndex;
    if (!VOID.has(tag) && !/\/>$/.test(m[0])) {
      const tr = new RegExp('<(/?)' + tag + '\\b[^>]*>', 'gi');
      tr.lastIndex = end;
      let depth = 1;
      let t;
      while (depth > 0 && (t = tr.exec(out))) {
        if (inComment(t.index)) continue;
        depth += t[1] ? -1 : (/\/>$/.test(t[0]) ? 0 : 1);
      }
      if (depth > 0) fail(where + ': <' + tag + ' ' + attr + '="' + m[2] + '"> is not closed');
      end = tr.lastIndex;
    }
    const ls = out.lastIndexOf('\n', start - 1) + 1;
    const le = out.indexOf('\n', end);
    if (!out.slice(ls, start).trim() && !out.slice(end, le < 0 ? out.length : le).trim()) {
      start = ls;
      end = le < 0 ? out.length : le + 1;
    }
    out = out.slice(0, start) + out.slice(end);
    from = start;
  }
}

/** Removes every element whose data-member="k" has k > n (the slide's own <section> is never removed). */
function dropMembers(html, n, where) {
  return dropElements(html, 'data-member', (v) => /^\d+$/.test(v) && +v > n, where);
}

/** Removes every element whose data-option="name" names an option that is off. */
function dropOptions(html, on, where) {
  return dropElements(html, 'data-option', (v) => !on.has(v.trim()), where);
}

/** Team options: manifest "options" ({ name: true|false }) with --option name=on|off overrides; checked against the markup. */
function teamOptions(man, bySlide, overrides) {
  const opts = man.options || {};
  if (typeof opts !== 'object' || Array.isArray(opts)) fail('manifest.json "options" must be an object { "name": true|false }');
  const val = {};
  for (const [k, v] of Object.entries(opts)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'boolean') fail('manifest "options".' + k + ' must be true or false; got ' + JSON.stringify(v));
    val[k] = v;
  }
  for (const o of overrides || []) {
    const m = String(o).match(/^([a-z][\w-]*)=(on|off|true|false)$/i);
    if (!m) fail('--option needs name=on|off; got ' + JSON.stringify(o));
    if (!(m[1] in val)) fail('--option ' + m[1] + ': no such option in manifest.json "options" (' + (Object.keys(val).join(', ') || 'none') + ')');
    val[m[1]] = /^(on|true)$/i.test(m[2]);
  }
  for (const s of bySlide.values()) {
    const scan = s.html.replace(/<!--[\s\S]*?-->/g, '');
    for (const m of scan.matchAll(/\sdata-option\s*=\s*"([^"]*)"/gi)) {
      if (!(m[1].trim() in val)) fail(s.group + '.html: data-option="' + m[1] + '" names no option in manifest.json "options"');
    }
  }
  return new Set(Object.keys(val).filter((k) => val[k]));
}

/** Sets (or replaces) data-export on a slide's opening tag. */
function setExport(html, value) {
  const open = html.match(/^<section\b[^>]*>/i)[0];
  const tag = open.replace(/\sdata-export\s*=\s*"[^"]*"/gi, '').replace(/>$/, ' data-export="' + value + '">');
  return tag + html.slice(open.length);
}

/** A member's own slide (<section data-member="k">) with k > n becomes an unused, hidden slot. */
function markSlot(html, n) {
  const open = html.match(/^<section\b[^>]*>/i)[0];
  const k = (open.match(/\sdata-member\s*=\s*"(\d+)"/i) || [])[1];
  if (!k || +k <= n) return html;
  const tag = open.replace(/\sdata-hidden(\s*=\s*"[^"]*")?/gi, '').replace(/\sdata-print-tag\s*=\s*"[^"]*"/gi, '').replace(/>$/, ' data-hidden="unused">');
  return tag + html.slice(open.length);
}

/** The team size: manifest "presenters" unless --presenters overrides it; checked against the member markers. */
function teamSize(man, bySlide, override) {
  const raw = override != null ? override : man.presenters;
  const n = Number(raw);
  const all = [];
  const slots = [];
  for (const s of bySlide.values()) {
    const open = s.html.match(/^<section\b[^>]*>/i)[0];
    const k = (open.match(/\sdata-member\s*=\s*"(\d+)"/i) || [])[1];
    if (k) slots.push(+k);
    const scan = s.html.replace(/<!--[\s\S]*?-->/g, '');
    for (const m of scan.matchAll(/\sdata-member\s*=\s*"(\d+)"/gi)) all.push(+m[1]);
  }
  if (!all.length) return { n: Number.isInteger(n) && n > 0 ? n : null, min: null, max: null };
  const max = Math.max(...all);
  const min = slots.length ? Math.min(...slots) - 1 : 1;
  if (!Number.isInteger(n) || n < min || n > max) {
    fail('presenters must be a whole number from ' + min + ' to ' + max + ' (manifest.json "presenters" or --presenters); got ' + JSON.stringify(raw));
  }
  return { n, min, max };
}

function readManifest() {
  const file = path.join(SRC, 'manifest.json');
  let man;
  try { man = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail('cannot read manifest.json: ' + e.message); }
  if (!Array.isArray(man.groups) || !Array.isArray(man.order)) fail('manifest.json needs "groups" and "order" arrays');
  return man;
}

function assemble() {
  const man = readManifest();
  const data = loadData();
  const bySlide = new Map();
  const groupCss = [];
  for (const g of man.groups) {
    const htmlFile = path.join(SRC, g.file + '.html');
    const cssFile = path.join(SRC, g.file + '.css');
    if (!fs.existsSync(htmlFile)) fail('missing ' + path.relative(DECK, htmlFile));
    if (fs.existsSync(cssFile)) groupCss.push(g.file + '.css');
    for (const s of splitSections(fs.readFileSync(htmlFile, 'utf8'), g.file + '.html')) {
      if (bySlide.has(s.id)) fail('slide #' + s.id + ' is defined twice (' + bySlide.get(s.id).group + ', ' + g.file + ')');
      bySlide.set(s.id, { group: g.file, owner: g.owner || g.file, html: s.html });
    }
  }
  const seen = new Set();
  for (const id of man.order) {
    if (seen.has(id)) fail('manifest order lists #' + id + ' twice');
    seen.add(id);
    if (!bySlide.has(id)) fail('manifest order lists #' + id + ' but no group defines it');
  }
  for (const [id, s] of bySlide) if (!seen.has(id)) fail('#' + id + ' (' + s.group + ') is not in the manifest order');
  const exp = man.export || {};
  if (typeof exp !== 'object' || Array.isArray(exp)) fail('manifest.json "export" must be an object { "slideId": "pdf|pptx|pdf pptx|none" }');
  for (const [id, v] of Object.entries(exp)) {
    if (!bySlide.has(id)) fail('manifest "export" names #' + id + ', which no group defines');
    const t = String(v).trim().split(/\s+/);
    if (!t.length || !t.every((x) => ['pdf', 'pptx', 'none'].includes(x)) || (t.includes('none') && t.length > 1)) fail('manifest "export" for #' + id + ': use "pdf", "pptx", "pdf pptx" or "none"; got ' + JSON.stringify(v));
  }
  return { man, bySlide, groupCss, data };
}

function render(out, opts) {
  const o = opts || {};
  const { man, bySlide, groupCss, data } = assemble();
  const team = teamSize(man, bySlide, o.presenters);
  const optsOn = teamOptions(man, bySlide, o.options);
  const tplFile = path.join(SRC, man.template || 'deck.template.html');
  let tpl = fs.readFileSync(tplFile, 'utf8');
  if (!tpl.includes('<!-- @@SLIDES -->') || !tpl.includes('<!-- @@GROUP-STYLES -->')) fail('template needs <!-- @@GROUP-STYLES --> and <!-- @@SLIDES -->');
  const rel = (p) => path.relative(path.dirname(out), path.join(SRC, p)).split(path.sep).join('/');
  const links = groupCss.map((c) => '<link rel="stylesheet" href="' + rel(c) + '">').join('\n');
  const slides = man.order.map((id, i) => {
    const s = bySlide.get(id);
    let html = s.html;
    if (team.n != null) html = dropMembers(markSlot(html, team.n), team.n, s.group + '.html #' + id);
    html = dropOptions(html, optsOn, s.group + '.html #' + id);
    if (man.export && man.export[id] != null) html = setExport(html, String(man.export[id]).trim());
    return '<!-- ' + String(i + 1).padStart(2, '0') + ' · #' + id + ' · ' + s.owner + ' -->\n' + expandDirectives(html, s.group + '.html #' + id, data);
  }).join('\n\n');
  tpl = tpl.replace('<!-- @@GROUP-STYLES -->', () => links).replace('<!-- @@SLIDES -->', () => slides);
  const teamNote = team.n != null ? ', ' + team.n + ' presenters' : '';
  tpl = tpl.replace(/<!-- @@ASSEMBLED -->/, () => '<meta name="generator" content="deck tools/assemble.cjs from slides/src (' + man.order.length + ' slides' + teamNote + ')">');
  if (team.n != null) {
    tpl = tpl.replace(/<html\b([^>]*)>/i, (m, attrs) => {
      let a = attrs.replace(/\sdata-presenters\s*=\s*"[^"]*"/i, '');
      const cls = 'team-' + team.n;
      if (/\sclass\s*=\s*"/i.test(a)) a = a.replace(/\sclass\s*=\s*"([^"]*)"/i, (x, c) => ' class="' + c.split(/\s+/).filter((t) => t && !/^team-\d+$/.test(t)).concat(cls).join(' ') + '"');
      else a += ' class="' + cls + '"';
      return '<html' + a + ' data-presenters="' + team.n + '">';
    });
  }
  tpl = tpl.replace(/<html\b([^>]*)>/i, (m, attrs) => '<html' + attrs.replace(/\sdata-options\s*=\s*"[^"]*"/i, '') + ' data-options="' + [...optsOn].join(' ') + '">');
  return { html: tpl, count: man.order.length, groups: man.groups.length, presenters: team.n, options: [...optsOn] };
}

function main() {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--presenters');
  const presenters = pi >= 0 ? (args[pi + 1] || fail('--presenters needs a number')) : undefined;
  const options = args.map((a, i) => (a === '--option' ? (args[i + 1] || fail('--option needs name=on|off')) : null)).filter((x) => x != null);
  if (args.includes('--list')) {
    const { man, bySlide } = assemble();
    const team = teamSize(man, bySlide, presenters);
    man.order.forEach((id, i) => {
      const open = bySlide.get(id).html.match(/^<section\b[^>]*>/i)[0];
      const k = (open.match(/\sdata-member\s*=\s*"(\d+)"/i) || [])[1];
      const unused = k && team.n != null && +k > team.n ? '  (unused: member ' + k + ' slot)' : '';
      console.log(String(i + 1).padStart(2, ' ') + '  ' + id.padEnd(6) + ' ' + bySlide.get(id).owner + unused);
    });
    if (team.n != null) console.log('presenters: ' + team.n);
    return;
  }
  const oi = args.indexOf('--out');
  const out = path.resolve(oi >= 0 ? args[oi + 1] || fail('--out needs a path') : path.join(SLIDES, 'big-d.html'));
  if (path.dirname(out) !== SLIDES) fail('--out must be a file directly in deck/slides/ (relative URLs), e.g. slides/.tmp-g3.html; got ' + out);
  if (!/\.html$/.test(out)) fail('--out must end in .html');
  const { html, count, groups, presenters: n, options: on } = render(out, { presenters, options });
  const tmp = out + '.' + process.pid + '.' + Date.now() + '.part';
  fs.writeFileSync(tmp, html);
  fs.renameSync(tmp, out);
  console.log('assemble: wrote ' + path.relative(process.cwd(), out) + ' (' + count + ' slides from ' + groups + ' groups' + (n != null ? ', ' + n + ' presenters' : '') + (on.length ? ', options: ' + on.join(' ') : '') + ', ' + (html.length / 1024).toFixed(1) + ' KiB)');
}

if (require.main === module) main();
module.exports = { splitSections, expandDirectives, dropElements, dropMembers, dropOptions, markSlot, teamSize, teamOptions, assemble, render };
