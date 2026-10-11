// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// The canonical origin. To move to a custom domain, set SITE_URL (for example
// in the Pages workflow) and add public/CNAME; nothing else changes.
const site = process.env.SITE_URL || 'https://amoghdprasanna.github.io';

const fs = '@fontsource-variable';

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith('/404/') })],
  markdown: {
    // The unified pipeline, for remark-math and KaTeX. MDX inherits it.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
  },
  image: { responsiveStyles: true },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-serif',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          { src: [`${fs}/newsreader/files/newsreader-latin-wght-normal.woff2`], weight: '200 800', style: 'normal' },
          { src: [`${fs}/newsreader/files/newsreader-latin-wght-italic.woff2`], weight: '200 800', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          { src: [`${fs}/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2`], weight: '100 800', style: 'normal' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Caveat',
      cssVariable: '--font-hand',
      fallbacks: ['cursive'],
      options: {
        variants: [
          { src: [`${fs}/caveat/files/caveat-latin-wght-normal.woff2`], weight: '400 700', style: 'normal' },
        ],
      },
    },
  ],
});
