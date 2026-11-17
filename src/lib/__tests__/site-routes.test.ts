import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  allStaticRoutes,
  EDITORIAL_SECTIONS,
  STANDALONE_ROUTES,
} from '../site-routes';

// Cross-checks the hand-written route manifest against the files on
// disk, so adding a page without a sitemap entry (or renaming an MDX
// file without updating its legacy redirect) fails the unit suite.

const ROOT = process.cwd();
const APP = join(ROOT, 'app');
const CONTENT = join(ROOT, 'content');

const pageFiles = (): string[] =>
  readdirSync(APP, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(`${sep}page.tsx`) || f === 'page.tsx');

const isDynamic = (file: string): boolean => file.includes('[');

const routeFor = (file: string): string => {
  const dir = file === 'page.tsx' ? '' : file.slice(0, -'/page.tsx'.length);
  return dir === '' ? '/' : `/${dir.split(sep).join('/')}/`;
};

const mdxFiles = (): string[] =>
  readdirSync(CONTENT, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.mdx') && !f.startsWith(`blogs${sep}`));

describe('site route manifest', () => {
  it('lists every static page.tsx under app/', () => {
    const onDisk = pageFiles()
      .filter((f) => !isDynamic(f))
      .map(routeFor)
      .sort();
    expect(STANDALONE_ROUTES.map((r) => r.path).sort()).toEqual(onDisk);
  });

  it('lists every optional catch-all editorial section', () => {
    const onDisk = pageFiles()
      .filter((f) => f.includes('[[...slug]]'))
      .map((f) => f.split(sep)[0])
      .sort();
    expect(EDITORIAL_SECTIONS.map((s) => s.segment).sort()).toEqual(onDisk);
  });

  it.each(EDITORIAL_SECTIONS.map((s) => [s.segment, s] as const))(
    'section %s lists every MDX file in content/',
    (segment, section) => {
      const onDisk = mdxFiles()
        .filter((f) => f.startsWith(`${segment}${sep}`))
        .map((f) => relative(segment, f).replace(/\.mdx$/, ''))
        .sort();
      expect(Object.keys(section.pages).sort()).toEqual(onDisk);
    }
  );

  it('every legacy path matches an attribution link in content/', () => {
    const corpus = mdxFiles()
      .map((f) => readFileSync(join(CONTENT, f), 'utf-8'))
      .join('\n');
    const legacy = allStaticRoutes().flatMap((r) =>
      r.legacyPath === undefined ? [] : [r.legacyPath]
    );
    expect(legacy.length).toBeGreaterThan(0);
    for (const path of legacy) {
      expect(corpus, path).toContain(`ndwt.org${path}`);
    }
  });

  it('uses trailing slashes and no duplicates', () => {
    const paths = allStaticRoutes().map((r) => r.path);
    for (const p of paths) expect(p).toMatch(/^\/(.*\/)?$/);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
