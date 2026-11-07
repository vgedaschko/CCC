#!/usr/bin/env node
/*
 * build.cjs: inline a deck into ONE self-contained, offline HTML file.
 *
 *   node tools/build.cjs <in.html> <out.html> [--strict]
 *
 * Inlines: <link rel="stylesheet"> (recursively, incl. @import), <script src>, url(...) in CSS
 * (fonts, images) and in style="" attributes, <img|source|video|audio|track|input src/poster>,
 * <link rel="icon">. Local files only; anything remote is reported (and fails the build with --strict).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MIME = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.vtt': 'text/vtt',
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'text/javascript',
};

function usage(msg) {
  if (msg) console.error('build: ' + msg);
  console.error('usage: node tools/build.cjs <in.html> <out.html> [--strict]');
  process.exit(2);
}

function isRemote(ref) {
  return /^(?:https?:)?\/\//i.test(ref);
}

function isLocal(ref) {
  if (!ref) return false;
  const r = ref.trim();
  // A fragment (also percent-encoded, as inside SVG data URIs: filter='url(%23n)') is never a file.
  if (!r || r.startsWith('#') || /^%23/.test(r)) return false;
  if (isRemote(r)) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(r) || /^file:/i.test(r);
}

function createBuilder(inFile) {
  const stats = { css: 0, js: 0, assets: 0, bytes: 0, remote: new Set(), missing: new Set() };

  function resolve(ref, baseDir) {
    const clean = ref.trim().split(/[?#]/)[0];
    if (/^file:/i.test(clean)) return require('url').fileURLToPath(clean);
    let decoded = clean;
    try { decoded = decodeURIComponent(clean); } catch { /* keep raw */ }
    return path.resolve(baseDir, decoded);
  }

  function readLocal(ref, baseDir) {
    const file = resolve(ref, baseDir);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      stats.missing.add(path.relative(process.cwd(), file));
      return null;
    }
    return file;
  }

  function dataUri(file) {
    const ext = path.extname(file).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const buf = fs.readFileSync(file);
    stats.assets += 1;
    stats.bytes += buf.length;
    return 'data:' + mime + ';base64,' + buf.toString('base64');
  }

  function processCss(css, baseDir, seen) {
    const chain = seen || new Set();
    let out = css.replace(/@import\s+(?:url\(\s*)?(['"]?)([^'")\s;]+)\1\s*\)?\s*([^;]*);/g, (m, q, ref, media) => {
      if (!isLocal(ref)) { if (isRemote(ref)) stats.remote.add(ref); return m; }
      const file = readLocal(ref, baseDir);
      if (!file || chain.has(file)) return m;
      const next = new Set(chain).add(file);
      const inner = processCss(fs.readFileSync(file, 'utf8'), path.dirname(file), next);
      stats.css += 1;
      return media.trim() ? '@media ' + media.trim() + ' {\n' + inner + '\n}' : inner;
    });
    // A quoted url("...") is consumed whole, so the url(%23g) references inside a quoted SVG data URI
    // (which also contains the other quote character) are never read as separate references.
    out = out.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'"()\s]*))\s*\)/g, (m, dq, sq, uq) => {
      const r = (dq != null ? dq : sq != null ? sq : uq).trim();
      if (!isLocal(r)) { if (isRemote(r)) stats.remote.add(r); return m; }
      const file = readLocal(r, baseDir);
      if (!file) return m;
      // Unquoted on purpose: base64 data URIs are valid unquoted and survive inside style="...".
      return 'url(' + dataUri(file) + ')';
    });
    return out;
  }

  function parseAttrs(tag) {
    const attrs = [];
    const body = tag.replace(/^<[a-z0-9-]+/i, '').replace(/\/?>$/, '');
    const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let m;
    while ((m = re.exec(body))) {
      const value = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : null;
      attrs.push({ name: m[1].toLowerCase(), raw: m[1], value });
    }
    return attrs;
  }

  function attr(attrs, name) {
    const a = attrs.find((x) => x.name === name);
    return a ? a.value : null;
  }

  function attrsToString(attrs, skip) {
    return attrs
      .filter((a) => !skip.includes(a.name))
      .map((a) => (a.value == null ? ' ' + a.raw : ' ' + a.raw + '="' + String(a.value).replace(/"/g, '&quot;') + '"'))
      .join('');
  }

  function escapeEndTag(text, tag) {
    return text.replace(new RegExp('</' + tag, 'gi'), '<\\/' + tag);
  }

  function build(html, baseDir) {
    let out = html;

    // <link ...>: stylesheets and icons
    out = out.replace(/<link\b[^>]*>/gi, (tag) => {
      const a = parseAttrs(tag);
      const rel = (attr(a, 'rel') || '').toLowerCase().split(/\s+/);
      const href = attr(a, 'href');
      if (!href) return tag;
      if (!isLocal(href)) { if (isRemote(href)) stats.remote.add(href); return tag; }
      if (rel.includes('stylesheet')) {
        const file = readLocal(href, baseDir);
        if (!file) return tag;
        stats.css += 1;
        const css = processCss(fs.readFileSync(file, 'utf8'), path.dirname(file), new Set([file]));
        const media = attr(a, 'media');
        return '<style data-inlined="' + path.basename(file) + '"' + (media ? ' media="' + media + '"' : '') + '>\n' + escapeEndTag(css, 'style') + '\n</style>';
      }
      if (rel.includes('icon') || rel.includes('apple-touch-icon')) {
        const file = readLocal(href, baseDir);
        if (!file) return tag;
        return '<link' + attrsToString(a, ['href']) + ' href="' + dataUri(file) + '">';
      }
      if (rel.includes('preload') || rel.includes('prefetch') || rel.includes('modulepreload')) return '';
      return tag;
    });

    // <style> blocks
    out = out.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (m, open, css, close) => {
      if (/data-inlined=/.test(open)) return m;
      return open + processCss(css, baseDir) + close;
    });

    // media and image attributes
    out = out.replace(/<(img|source|video|audio|track|input|embed|image)\b[^>]*>/gi, (tag) => {
      return tag.replace(/\b(src|poster|href|xlink:href)\s*=\s*(["'])([^"']*)\2/gi, (m, name, q, ref) => {
        if (!isLocal(ref)) { if (isRemote(ref)) stats.remote.add(ref); return m; }
        const file = readLocal(ref, baseDir);
        return file ? name + '=' + q + dataUri(file) + q : m;
      });
    });

    // style="..." attributes with url(...)
    out = out.replace(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (m, dq, sq) => {
      const css = dq != null ? dq : sq;
      if (!/url\(/i.test(css)) return m;
      const q = dq != null ? '"' : "'";
      return 'style=' + q + processCss(css, baseDir) + q;
    });

    // <script src="..."></script>
    out = out.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script\s*>/gi, (tag) => {
      const open = tag.match(/^<script\b[^>]*>/i)[0];
      const a = parseAttrs(open);
      const src = attr(a, 'src');
      if (!src) return tag;
      if (!isLocal(src)) { if (isRemote(src)) stats.remote.add(src); return tag; }
      const file = readLocal(src, baseDir);
      if (!file) return tag;
      stats.js += 1;
      const js = fs.readFileSync(file, 'utf8');
      // defer/async have no effect on inline scripts; deck.js waits for DOMContentLoaded itself.
      return '<script' + attrsToString(a, ['src', 'defer', 'async', 'integrity', 'crossorigin']) + ' data-inlined="' + path.basename(file) + '">\n' +
        escapeEndTag(js, 'script').replace(/<!--/g, '<\\!--') + '\n</script>';
    });

    // Report anything remote that is still referenced.
    out.replace(/\b(?:src|href|poster)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi, (m, ref) => { stats.remote.add(ref); return m; });

    const stamp = '<meta name="generator" content="deck tools/build.cjs ' + new Date().toISOString() + ' from ' + path.basename(inFile) + '">';
    out = out.replace(/<head\b[^>]*>/i, (h) => h + '\n' + stamp);
    return out;
  }

  return { build, stats };
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const files = args.filter((a) => !a.startsWith('--'));
  if (files.length !== 2) usage('expected <in.html> <out.html>');
  const inFile = path.resolve(files[0]);
  const outFile = path.resolve(files[1]);
  if (!fs.existsSync(inFile)) usage('input not found: ' + files[0]);

  const { build, stats } = createBuilder(inFile);
  const html = build(fs.readFileSync(inFile, 'utf8'), path.dirname(inFile));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);

  const size = fs.statSync(outFile).size;
  console.log('build: wrote ' + path.relative(process.cwd(), outFile) + ' (' + (size / 1024).toFixed(1) + ' KiB): ' +
    stats.css + ' stylesheet(s), ' + stats.js + ' script(s), ' + stats.assets + ' asset(s) inlined');
  stats.missing.forEach((m) => console.warn('build: WARNING missing local file: ' + m));
  stats.remote.forEach((r) => console.warn('build: WARNING remote reference left in place (needs network): ' + r));
  if (strict && (stats.remote.size || stats.missing.size)) {
    console.error('build: --strict: failing because of remote or missing references');
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { createBuilder };
