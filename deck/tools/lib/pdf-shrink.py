#!/usr/bin/env python3
"""
pdf-shrink.py: a LOSSLESS size pass over a Chromium-printed PDF (optional step of tools/export-pdf.cjs).

    python3 tools/lib/pdf-shrink.py <in.pdf> <out.pdf>

Needs pikepdf (pip install --user pikepdf). Without it the script exits with code 3 and export-pdf.cjs keeps
the PDF as Chromium wrote it. Nothing is re-rendered or re-encoded lossily: text stays text, images keep their
pixels (JPEG data is copied byte for byte).

  1. identical streams are merged: Chromium writes the same glow mask, glyph procedure or picture once per page
     (e.g. a card shadow on S16 and S17); references are pointed at one copy (repeated until nothing changes,
     so streams that differ only by a reference to a merged copy merge too)
  2. flate streams are recompressed at level 9
  3. the many small dictionaries are packed into compressed object streams (PDF 1.5)

Prints one JSON line: {"pages": n, "before": bytes, "after": bytes, "merged": streams}.
"""
import hashlib
import json
import os
import sys

try:
    import pikepdf
except ImportError:
    sys.stderr.write('pdf-shrink: pikepdf is not installed (pip install --user pikepdf)\n')
    sys.exit(3)


def ser(v, remap):
    """A stable text form of a PDF value; indirect references are written by (remapped) object number."""
    if isinstance(v, (pikepdf.Dictionary, pikepdf.Array, pikepdf.Stream)) and v.is_indirect:
        og = remap.get(v.objgen, v.objgen)
        return 'R%d_%d' % og
    if isinstance(v, pikepdf.Stream):
        return 'S?'
    if isinstance(v, pikepdf.Dictionary):
        return '<<' + ','.join(k + '=' + ser(v[k], remap) for k in sorted(v.keys())) + '>>'
    if isinstance(v, pikepdf.Array):
        return '[' + ','.join(ser(x, remap) for x in v) + ']'
    try:
        return repr(v)
    except Exception:  # pragma: no cover - exotic scalar
        return str(v)


def stream_key(obj, remap):
    d = obj.stream_dict
    head = '|'.join(k + '=' + ser(d[k], remap) for k in sorted(d.keys()) if k not in ('/Length',))
    return hashlib.sha256(obj.read_raw_bytes() + b'\0' + head.encode('utf-8', 'surrogatepass')).hexdigest()


def find_duplicates(pdf, remap):
    canon = {}
    found = {}
    for obj in pdf.objects:
        if not isinstance(obj, pikepdf.Stream) or obj.objgen in remap:
            continue
        k = stream_key(obj, remap)
        if k in canon:
            found[obj.objgen] = canon[k]
        else:
            canon[k] = obj.objgen
    return found


def relink(container, remap, objects):
    """Point every reference to a merged stream at its canonical copy (recursing into direct containers)."""
    keys = list(container.keys()) if isinstance(container, pikepdf.Dictionary) else range(len(container))
    for k in keys:
        v = container[k]
        if isinstance(v, (pikepdf.Dictionary, pikepdf.Array, pikepdf.Stream)) and v.is_indirect:
            if v.objgen in remap:
                container[k] = objects[remap[v.objgen]]
        elif isinstance(v, (pikepdf.Dictionary, pikepdf.Array)):
            relink(v, remap, objects)


def main():
    if len(sys.argv) != 3:
        sys.stderr.write('usage: pdf-shrink.py <in.pdf> <out.pdf>\n')
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    before = os.path.getsize(src)
    pikepdf.settings.set_flate_compression_level(9)
    with pikepdf.open(src) as pdf:
        pages = len(pdf.pages)
        remap = {}
        for _ in range(6):
            new = find_duplicates(pdf, remap)
            if not new:
                break
            remap.update(new)
        # resolve chains (a -> b -> c) to the final canonical object
        for og in list(remap):
            t = remap[og]
            while t in remap:
                t = remap[t]
            remap[og] = t
        if remap:
            objects = {og: pdf.get_object(og) for og in set(remap.values())}
            for obj in pdf.objects:
                if isinstance(obj, pikepdf.Stream):
                    relink(obj.stream_dict, remap, objects)
                elif isinstance(obj, (pikepdf.Dictionary, pikepdf.Array)):
                    relink(obj, remap, objects)
        pdf.save(
            dst,
            compress_streams=True,
            recompress_flate=True,
            stream_decode_level=pikepdf.StreamDecodeLevel.generalized,
            object_stream_mode=pikepdf.ObjectStreamMode.generate,
        )
    with pikepdf.open(dst) as check:
        if len(check.pages) != pages:
            sys.stderr.write('pdf-shrink: page count changed (%d -> %d)\n' % (pages, len(check.pages)))
            return 1
    print(json.dumps({'pages': pages, 'before': before, 'after': os.path.getsize(dst), 'merged': len(remap)}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
