#!/usr/bin/env node
/*
 * assemble.cjs: build the deck HTML from slides/src (template + one partial pair per group).
 *
 *   node tools/assemble.cjs                         -> slides/big-d.html (the integrator's output)
 *   node tools/assemble.cjs --out slides/.tmp-g3.html   a private copy for one builder (gitignored)
 *   node tools/assemble.cjs --list                  print the slide order with owners and exit
 *
 * Sources (slides/src/):
 *   deck.template.html   head, config, sprite, <div id="stage">; markers <!-- @@GROUP-STYLES --> and <!-- @@SLIDES -->
 *   manifest.json        { "groups": [{ "file": "03-g3-per", "owner": "g3-per" }, …], "order": ["s01", …] }
 *   NN-group.html        only <section class="slide" id="…"> elements (comments allowed between them)
 *   NN-group.css         styles scoped to that group's slide ids
 * The manifest's "order" places every slide; a group file may hold its slides in any order.
 * Directives inside a slide are expanded here:  <!--@axis {json}-->  (tools/lib/axis.cjs).
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
  return { man, bySlide, groupCss, data };
}

function render(out) {
  const { man, bySlide, groupCss, data } = assemble();
  const tplFile = path.join(SRC, man.template || 'deck.template.html');
  let tpl = fs.readFileSync(tplFile, 'utf8');
  if (!tpl.includes('<!-- @@SLIDES -->') || !tpl.includes('<!-- @@GROUP-STYLES -->')) fail('template needs <!-- @@GROUP-STYLES --> and <!-- @@SLIDES -->');
  const rel = (p) => path.relative(path.dirname(out), path.join(SRC, p)).split(path.sep).join('/');
  const links = groupCss.map((c) => '<link rel="stylesheet" href="' + rel(c) + '">').join('\n');
  const slides = man.order.map((id, i) => {
    const s = bySlide.get(id);
    return '<!-- ' + String(i + 1).padStart(2, '0') + ' · #' + id + ' · ' + s.owner + ' -->\n' + expandDirectives(s.html, s.group + '.html #' + id, data);
  }).join('\n\n');
  tpl = tpl.replace('<!-- @@GROUP-STYLES -->', () => links).replace('<!-- @@SLIDES -->', () => slides);
  tpl = tpl.replace(/<!-- @@ASSEMBLED -->/, () => '<meta name="generator" content="deck tools/assemble.cjs from slides/src (' + man.order.length + ' slides)">');
  return { html: tpl, count: man.order.length, groups: man.groups.length };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    const { man, bySlide } = assemble();
    man.order.forEach((id, i) => console.log(String(i + 1).padStart(2, ' ') + '  ' + id.padEnd(6) + ' ' + bySlide.get(id).owner));
    return;
  }
  const oi = args.indexOf('--out');
  const out = path.resolve(oi >= 0 ? args[oi + 1] || fail('--out needs a path') : path.join(SLIDES, 'big-d.html'));
  if (path.dirname(out) !== SLIDES) fail('--out must be a file directly in deck/slides/ (relative URLs), e.g. slides/.tmp-g3.html; got ' + out);
  if (!/\.html$/.test(out)) fail('--out must end in .html');
  const { html, count, groups } = render(out);
  const tmp = out + '.' + process.pid + '.' + Date.now() + '.part';
  fs.writeFileSync(tmp, html);
  fs.renameSync(tmp, out);
  console.log('assemble: wrote ' + path.relative(process.cwd(), out) + ' (' + count + ' slides from ' + groups + ' groups, ' + (html.length / 1024).toFixed(1) + ' KiB)');
}

if (require.main === module) main();
module.exports = { splitSections, expandDirectives, assemble, render };
