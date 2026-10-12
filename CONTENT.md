# Editing the site

Everything you'd want to change lives in `src/content/` (Markdown) or two small
TypeScript files. Run `npm run dev` while editing: anything still marked TODO
shows up as a yellow box in dev and never appears on the deployed site.

Push to `main` and GitHub Actions rebuilds and deploys in about a minute.

## Add an arXiv preprint (2 minutes)

Create `src/content/publications/<short-name>.md`:

```md
---
title: Learned decompositions for transmon qudits
authors: [Amogh D. Prasanna, Tanay Roy]
status: preprint
arxiv: "2611.01234"
year: 2026
bibkey: prasanna2026qudit
---
```

Preprints sort to the top of Publications automatically and get a Copy BibTeX
button. When it's published, change `status: published` and add `venue`,
`volume`, `issue`, `pages`, `doi` and set `peerReviewed: true`.

## Add a research project (5 minutes)

Create `src/content/research/<slug>.mdx`. The slug becomes `/research/<slug>/`.

```mdx
---
question: Can a decoder keep up with a real surface code?
summary: Two or three plain sentences. First person, no buzzwords.
order: 5                     # position on the homepage
year: "2027"
place: UMD
status: ongoing              # ongoing | write-up in progress | preprint | published
metric: { value: "0.3%", label: "logical error rate at distance 5" }   # optional
tags: [Stim, PyMatching]
collaborators: [Prof. Someone (Somewhere)]
links: [{ label: Code, url: https://github.com/... }]
ink: eq-stabilizer           # optional handwritten equation from src/assets/ink
inkLabel: "From my notes: what the equation is"
note: a short margin note    # optional, handwritten in the margin
draft: false                 # true hides it everywhere
---

import Figure from '../../components/Figure.astro';
import fig from '../../assets/figures/my-plot.png';

## Motivation
...

Inline math $\lvert\psi\rangle$ and display math:

$$
\mathcal{L}(\theta) = 1 - \tfrac{1}{d^2}\bigl\lvert \mathrm{Tr}\, U^\dagger V(\theta) \bigr\rvert^2
$$

## Results
<Figure src={fig} alt="Describe the plot" caption="What the reader should see." />
```

`<Figure caption="..." />` without `src` draws a placeholder frame.

## Update "Now"

Edit `src/content/now.md`: change `updated:` and the bullet list.

## Add a reading

Create `src/content/readings/<name>.md` with `title`, `author`, `year`, `url`,
`shelf` (`Ongoing`, `On doing research` or `Mindset`), `takeaway` (one line in
your words), `order`, and optionally `note` (handwritten margin note) and
`teaser: true` to show it on the homepage.

## Software

`src/content/software/*.md`. `earlier: true` moves an entry under
"Earlier engineering work".

## CV, links, education

- `public/cv.pdf` is the PDF behind every CV link. Replace the file to update it.
- `src/data/cv.ts` holds education, coursework, experience, skills and awards
  (used by the homepage and `/cv`).
- `src/site.ts` holds your name, email and links. Google Scholar and ORCID are
  `null` until you fill them in; they appear everywhere once set.

## Handwritten equations

`src/assets/ink/*.svg` are strokes lifted from my own notes (vector ink from an
iPad PDF). To add one, see `tools/ink/README.md`.

Margin notes and equation captions are drawn in my handwriting when their text
matches an entry in `src/data/hand.ts`. If you change a note's wording, it
switches back to the Caveat font until you write the new wording out by hand.

## Custom domain

1. Add `public/CNAME` containing just the domain, e.g. `amoghdp.com`.
2. In the repo's Settings → Secrets and variables → Actions → Variables, add
   `SITE_URL` = `https://amoghdp.com`.
3. Point the domain's DNS at GitHub Pages and set it under Settings → Pages.

Canonical URLs, the sitemap, robots.txt and Open Graph tags all follow `SITE_URL`.

## Share image

`public/og.png` is rendered from the live hero. After changing the hero, run
`npm run build && npx astro preview`, then in another terminal
`npx -y -p puppeteer-core@23.11.1 node tools/og/og.mjs`.
