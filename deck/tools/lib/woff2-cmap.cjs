/*
 * woff2-cmap.cjs: read the set of Unicode code points a .woff2 (or .ttf/.otf) font maps to a glyph.
 * No dependencies: WOFF2 is decompressed with Node's built-in Brotli. The cmap table is never
 * transformed in WOFF2, so it can be read straight from the decompressed table stream.
 *
 *   const { codepoints } = require('./woff2-cmap.cjs'); codepoints('font.woff2') -> Set<number>
 */
'use strict';

const fs = require('fs');
const zlib = require('zlib');

const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep',
  'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln',
  'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf',
  'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function base128(buf, pos) {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const b = buf[pos.i++];
    v = (v * 128) + (b & 0x7f);
    if (!(b & 0x80)) return v;
  }
  throw new Error('bad UIntBase128');
}

function cmapFromWoff2(buf) {
  const numTables = buf.readUInt16BE(12);
  const pos = { i: 48 };
  const dir = [];
  for (let t = 0; t < numTables; t++) {
    const flags = buf[pos.i++];
    const tagIdx = flags & 0x3f;
    let tag;
    if (tagIdx === 63) { tag = buf.toString('latin1', pos.i, pos.i + 4); pos.i += 4; } else tag = KNOWN[tagIdx];
    const version = flags >> 6;
    const orig = base128(buf, pos);
    const transformed = (tag === 'glyf' || tag === 'loca') ? version !== 3 : version !== 0;
    const len = transformed ? base128(buf, pos) : orig;
    dir.push({ tag, len });
  }
  const compLen = buf.readUInt32BE(20);
  const data = zlib.brotliDecompressSync(buf.subarray(pos.i, pos.i + compLen));
  let off = 0;
  for (const d of dir) {
    if (d.tag === 'cmap') return data.subarray(off, off + d.len);
    off += d.len;
  }
  throw new Error('no cmap table');
}

function cmapFromSfnt(buf) {
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const r = 12 + i * 16;
    if (buf.toString('latin1', r, r + 4) === 'cmap') {
      const off = buf.readUInt32BE(r + 8);
      return buf.subarray(off, off + buf.readUInt32BE(r + 12));
    }
  }
  throw new Error('no cmap table');
}

function parseCmap(t) {
  const out = new Set();
  const n = t.readUInt16BE(2);
  const subs = [];
  for (let i = 0; i < n; i++) {
    const p = 4 + i * 8;
    subs.push({ pid: t.readUInt16BE(p), eid: t.readUInt16BE(p + 2), off: t.readUInt32BE(p + 4) });
  }
  // Prefer full-repertoire subtables (format 12), then BMP ones (format 4).
  const pick = subs.map((s) => ({ ...s, fmt: t.readUInt16BE(s.off) }))
    .filter((s) => (s.pid === 3 && (s.eid === 10 || s.eid === 1)) || s.pid === 0)
    .sort((a, b) => (b.fmt === 12) - (a.fmt === 12));
  for (const s of pick) {
    const o = s.off;
    if (s.fmt === 12) {
      const groups = t.readUInt32BE(o + 12);
      for (let g = 0; g < groups; g++) {
        const p = o + 16 + g * 12;
        const start = t.readUInt32BE(p);
        const end = t.readUInt32BE(p + 4);
        const gid = t.readUInt32BE(p + 8);
        for (let c = start; c <= end; c++) if (gid + (c - start)) out.add(c);
      }
      return out;
    }
    if (s.fmt === 4) {
      const segX2 = t.readUInt16BE(o + 6);
      const ends = o + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let k = 0; k < segX2 / 2; k++) {
        const end = t.readUInt16BE(ends + 2 * k);
        const start = t.readUInt16BE(starts + 2 * k);
        const delta = t.readInt16BE(deltas + 2 * k);
        const ro = t.readUInt16BE(ranges + 2 * k);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let gid;
          if (ro === 0) gid = (c + delta) & 0xffff;
          else {
            const gp = ranges + 2 * k + ro + 2 * (c - start);
            gid = t.readUInt16BE(gp);
            if (gid) gid = (gid + delta) & 0xffff;
          }
          if (gid) out.add(c);
        }
      }
      return out;
    }
  }
  return out;
}

function codepoints(file) {
  const buf = fs.readFileSync(file);
  const sig = buf.toString('latin1', 0, 4);
  return parseCmap(sig === 'wOF2' ? cmapFromWoff2(buf) : cmapFromSfnt(buf));
}

/** Parse a CSS unicode-range value ("U+0000-00FF,U+0131") into a predicate. */
function parseRange(spec) {
  const parts = String(spec || '').split(',').map((p) => p.trim().replace(/^U\+/i, '')).filter(Boolean).map((p) => {
    if (p.includes('?')) return [parseInt(p.replace(/\?/g, '0'), 16), parseInt(p.replace(/\?/g, 'F'), 16)];
    const [a, b] = p.split('-');
    return [parseInt(a, 16), parseInt(b || a, 16)];
  });
  return (c) => !parts.length || parts.some(([a, b]) => c >= a && c <= b);
}

module.exports = { codepoints, parseRange };
