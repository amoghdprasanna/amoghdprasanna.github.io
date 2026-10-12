# Handwritten equations

The equations on the site are my own handwriting, lifted as vector strokes from
a PDF exported from my iPad notes (each pen stroke is a path in the PDF). They
are inlined as SVG with `stroke="currentColor"`, so they take the theme colour
and draw themselves in as you scroll.

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf
INK_PREC=1 INK_PDF=~/path/to/notes.pdf .venv/bin/python ink.py notebook.json ../../src/assets/ink
```

- `ink.py` copies every stroke whose centre lies inside a rectangle on a page
  (coordinates in PDF points; render the page with a ruler to find them).
  Dark filled shapes are copied too. `INK_PREC=1` keeps one decimal in the
  path data, which keeps the files small.
- `notebook.json` is the current set, cut from a two-page notes PDF (equations
  on page 2, margin notes on page 1). Several pieces in one entry compose a
  new layout: the `)` added to `eq-loss`, and the line breaks in the longer
  notes. `crops.json` is the older set (only `eq-purity` is still used).
- Notes: `src/data/hand.ts` maps a note's text to its ink, so any `<Note>` or
  `inkLabel` caption whose text matches is drawn in my handwriting. Change
  the text and it falls back to the Caveat font until I write it out.
- `compose.py` builds a new equation glyph by glyph (`eq-qudit.svg`,
  U ∈ SU(d) → ∏ₖ e^{−iHₖtₖ}) from letters found across the notes, keeping the
  pen width constant when a glyph is scaled into a superscript.

The source PDF is not committed (it has my student ID on it).
