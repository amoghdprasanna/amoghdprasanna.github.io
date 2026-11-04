import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({ label: z.string(), url: z.string() });

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: z.object({
    question: z.string(),
    summary: z.string(),
    order: z.number(),
    year: z.string(),
    place: z.string(),
    status: z.enum(['ongoing', 'write-up in progress', 'published', 'preprint']),
    metric: z.object({ value: z.string(), label: z.string() }).optional(),
    tags: z.array(z.string()).default([]),
    collaborators: z.array(z.string()).default([]),
    links: z.array(link).default([]),
    // Handwritten equation from src/assets/ink shown beside the card.
    ink: z.string().optional(),
    // What the equation says, for screen readers.
    inkAlt: z.string().optional(),
    // Caption under it; drawn by hand if it matches src/data/hand.ts.
    inkLabel: z.string().optional(),
    note: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    status: z.enum(['preprint', 'published', 'in preparation']),
    venue: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.string().optional(),
    year: z.number().optional(),
    month: z.string().optional(),
    doi: z.string().optional(),
    arxiv: z.string().optional(),
    url: z.string().optional(),
    peerReviewed: z.boolean().default(false),
    bibkey: z.string().optional(),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

const software = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/software' }),
  schema: z.object({
    name: z.string(),
    question: z.string(),
    summary: z.string(),
    stack: z.array(z.string()).default([]),
    url: z.string().optional(),
    context: z.string().optional(),
    earlier: z.boolean().default(false),
    order: z.number(),
  }),
});

// One collection for the shelf (things read or followed, with a takeaway) and
// for resources (tools and references worth pointing people to). `status` is
// left out unless it's actually known.
export const readingTopics = ['Quantum error correction', 'Quantum computing & complexity', 'Doing research'] as const;
export const resourceTopics = ['Software & simulation', 'Learning'] as const;

const readings = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/readings' }),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    year: z.string().optional(),
    venue: z.string().optional(),
    url: z.string(),
    kind: z.enum(['reading', 'resource']).default('reading'),
    topic: z.enum([...readingTopics, ...resourceTopics]),
    status: z.enum(['read', 'reading', 'want to read', 'following']).optional(),
    takeaway: z.string(),
    note: z.string().optional(),
    teaser: z.boolean().default(false),
    order: z.number(),
  }),
});

const now = defineCollection({
  loader: glob({ pattern: 'now.md', base: './src/content' }),
  schema: z.object({ updated: z.coerce.date() }),
});

export const collections = { research, publications, software, readings, now };
