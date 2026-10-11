"""Typeset an equation from individual handwritten glyphs.

Each glyph: (name, page, x0, y0, x1, y1). A layout is a list of
(glyph, scale, raise, gap_before, align) where raise lifts the glyph's bottom
above the baseline (negative lowers it), in units of the main glyph size.
"""
import re, sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from ink import piece, f

GLYPHS = {
    'U':      (13, 126, 140, 150, 166),
    'inSU':   (10, 252, 108, 282.5, 136),
    'lparen': (10, 72, 186, 79.5, 212),
    'rparen': (10, 299.5, 108, 306, 136),
    'd':      (10, 51.2, 186, 58.3, 212, 1),
    'arrow':  (13, 28, 50, 52, 66),
    'prod':   (2, 164, 238, 176, 258),
    'e-i':    (13, 293, 420, 307.5, 448),
    'H':      (10, 100, 141, 113, 165),
    'k':      (13, 349.5, 186, 361, 212, 1),
    't':      (13, 294.2, 44, 303, 64, 1),
}


def glyph(name):
    pn, x0, y0, x1, y1, *clip = GLYPHS[name]
    paths = piece(pn, x0, y0, x1, y1, 0, 0, 1, bool(clip))
    nums = [float(n) for d, _ in paths for n in re.findall(r'-?\d+(?:\.\d+)?', d)]
    xs, ys = nums[0::2], nums[1::2]
    return paths, (min(xs), min(ys), max(xs), max(ys))


def compose(layout, pad=3):
    out, cur = [], 0.0
    lo, hi, right = 1e9, -1e9, 0
    for name, s, rise, gap, *rest in layout:
        paths, (bx0, by0, bx1, by1) = glyph(name)
        cur += gap
        # place bbox bottom at baseline 0 minus rise
        tx = cur - bx0 * s
        ty = -rise - by1 * s
        body = ''.join(f'<path stroke-width="{f(w / s * (0.8 + 0.2 * s))}" d="{d}"/>' for d, w in paths)
        out.append(f'<g transform="translate({f(tx)} {f(ty)}) scale({f(s)})">{body}</g>')
        lo = min(lo, ty + by0 * s); hi = max(hi, ty + by1 * s)
        cur += (bx1 - bx0) * s
        right = cur
    vb = f'{f(-pad)} {f(lo - pad)} {f(right + 2 * pad)} {f(hi - lo + 2 * pad)}'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="none" stroke="currentColor" '
            f'stroke-linecap="round" stroke-linejoin="round">{"".join(out)}</svg>')


QUDIT = [
    ('U', 1, 0, 0),
    ('inSU', 1, 0, 4),
    ('lparen', 1, -1.8, 1),
    ('d', 0.95, 0, 2.2),
    ('rparen', 1, -1.8, 1.2),
    ('arrow', 1, 3.5, 7),
    ('prod', 1, -1, 7),
    ('k', .45, -5, .5),
    ('e-i', 1, 0, 3),
    ('H', .52, 10.5, 1.4),
    ('k', .36, 8.6, .5),
    ('t', .55, 10.5, 1.6),
    ('k', .36, 8.6, .5),
]

if __name__ == '__main__':
    open(sys.argv[1], 'w').write(compose(QUDIT))
