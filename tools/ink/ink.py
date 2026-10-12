"""Lift handwritten ink strokes from the problem-set PDF into themeable SVGs.

Usage: python ink.py spec.json outdir
spec: {"name": [[page, x0, y0, x1, y1, dx, dy, scale], ...], ...}
Each piece copies the strokes whose bbox centre lies in the rect, shifts the
rect origin to (dx, dy) and scales by `scale`. Output uses currentColor.
Dark filled shapes (some pens export short marks, like the bar of a ⊆, as
fills) are copied too and drawn filled.
"""
import json, os, sys, pymupdf

PDF = os.environ.get('INK_PDF', 'notes.pdf')
doc = pymupdf.open(PDF)
_cache = {}
PREC = int(os.environ.get('INK_PREC', 2))  # decimals kept in path data


def strokes(pn):
    if pn not in _cache:
        out = []
        for d in doc[pn - 1].get_drawings():
            c = d.get('color') if d['type'] == 's' else d.get('fill') if d['type'] == 'f' else None
            if not c or max(c) > 0.3:
                continue
            out.append(d)
        _cache[pn] = out
    return _cache[pn]


def f(v):
    return f'{v:.{PREC}f}'.rstrip('0').rstrip('.')


def piece(pn, x0, y0, x1, y1, dx, dy, s, clip=False):
    paths, w = [], 1.0
    for d in strokes(pn):
        r = d['rect']
        cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
        inside = lambda p: x0 <= p.x <= x1 and y0 <= p.y <= y1
        if not clip and not (x0 <= cx <= x1 and y0 <= cy <= y1):
            continue
        w = d.get('width') or w
        T = lambda p: (f((p.x - x0) * s + dx), f((p.y - y0) * s + dy))
        seg, last = [], None
        for it in d['items']:
            if clip and not (inside(it[1]) and inside(it[-1])):
                last = None
                continue
            if it[0] == 'l':
                a, b = it[1], it[2]
                if last is None or abs(last.x - a.x) + abs(last.y - a.y) > 0.01:
                    seg.append('M%s %s' % T(a))
                seg.append('L%s %s' % T(b)); last = b
            elif it[0] == 'c':
                a, c1, c2, b = it[1:5]
                if last is None or abs(last.x - a.x) + abs(last.y - a.y) > 0.01:
                    seg.append('M%s %s' % T(a))
                seg.append('C%s %s %s %s %s %s' % (*T(c1), *T(c2), *T(b))); last = b
        if seg:
            paths.append((''.join(seg) + ('Z' if d['type'] == 'f' else ''), 'fill' if d['type'] == 'f' else w * s))
    return paths


def build(pieces, pad=2):
    allp = []
    for pc in pieces:
        allp += piece(*pc)
    # bbox from numbers in path data
    import re
    xs, ys = [], []
    for d, _ in allp:
        nums = list(map(float, re.findall(r'-?\d+(?:\.\d+)?', d)))
        xs += nums[0::2]; ys += nums[1::2]
    if not xs: return None, 0, 0
    mx, my = min(xs) - pad, min(ys) - pad
    W, H = max(xs) - mx + pad, max(ys) - my + pad
    # group by stroke width
    groups = {}
    for d, w in allp:
        groups.setdefault(w if w == 'fill' else round(w, 2), []).append(d)
    body = ''.join(
        f'<path fill="currentColor" stroke="none" d="{"".join(ds)}"/>' if w == 'fill' else f'<path stroke-width="{w}" d="{"".join(ds)}"/>'
        for w, ds in groups.items())
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(mx)} {f(my)} {f(W)} {f(H)}" '
           f'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')
    return svg, W, H


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    for name, pieces in spec.items():
        svg, W, H = build(pieces)
        if svg is None: print(name, "EMPTY"); continue
        open(f'{sys.argv[2]}/{name}.svg', 'w').write(svg)
        print(name, round(W), round(H), len(svg), 'bytes')
