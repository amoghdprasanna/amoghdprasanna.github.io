# Handwritten equations

The equations on the site are my own handwriting, lifted as vector strokes from
a PDF exported from my iPad notes (each pen stroke is a path in the PDF). They
are inlined as SVG with `stroke="currentColor"`, so they take the theme colour
and draw themselves in as you scroll.

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf
INK_PDF=~/path/to/notes.pdf .venv/bin/python ink.py crops.json ../../src/assets/ink
```

- `ink.py` copies every stroke whose centre lies inside a rectangle on a page
  (coordinates in PDF points; render the page with a ruler to find them).
  `crops.json` lists the equations that were cut out whole.
- `compose.py` builds a new equation glyph by glyph (`eq-qudit.svg`,
  U ∈ SU(d) → ∏ₖ e^{−iHₖtₖ}) from letters found across the notes, keeping the
  pen width constant when a glyph is scaled into a superscript.

The source PDF is not committed (it has my student ID on it).
