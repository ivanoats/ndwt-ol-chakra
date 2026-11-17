import { describe, expect, it } from 'vitest';

import { buildRedirects, legacySiteId } from '../legacy-redirects';

const LEGACY = 'http://www.ndwt.org/ndwt/explore/site.asp?site=';

/** Parse the `_redirects` body into whitespace-split rule tokens. */
const rules = (body: string): string[][] =>
  body
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));

/** Index of the first rule whose source is `from`. */
const indexOf = (body: string, from: string): number =>
  rules(body).findIndex((tokens) => tokens[0] === from);

describe('legacySiteId', () => {
  it('extracts the numeric site id', () => {
    expect(legacySiteId(`${LEGACY}130`)).toBe('130');
  });

  it('is case-insensitive on the path', () => {
    expect(
      legacySiteId('http://www.ndwt.org/NDWT/Explore/Site.asp?site=7')
    ).toBe('7');
  });

  it.each([
    ['not a url'],
    ['http://www.ndwt.org/ndwt/explore/lnt.asp?site=1'],
    [`${LEGACY}abc`],
    ['http://www.ndwt.org/ndwt/explore/site.asp'],
  ])('returns undefined for %s', (url) => {
    expect(legacySiteId(url)).toBeUndefined();
  });
});

describe('buildRedirects', () => {
  const body = buildRedirects([
    { slug: 'blalock-canyon', sourceUrl: `${LEGACY}130` },
    { slug: 'harper-s-bend', sourceUrl: `${LEGACY}202` },
    { slug: 'dupe', sourceUrl: `${LEGACY}130` },
    { slug: 'no-source' },
  ]);

  it('maps the legacy query URL to the per-id hop', () => {
    expect(rules(body)).toContainEqual([
      '/ndwt/explore/site.asp',
      'site=:id',
      '/sites/legacy/:id/',
      '301',
    ]);
  });

  it('maps each legacy id to its slug, first wins on duplicates', () => {
    const parsed = rules(body);
    expect(parsed).toContainEqual([
      '/sites/legacy/130/',
      '/sites/blalock-canyon/',
      '301',
    ]);
    expect(parsed).toContainEqual([
      '/sites/legacy/202/',
      '/sites/harper-s-bend/',
      '301',
    ]);
    expect(
      parsed.filter((tokens) => tokens[0] === '/sites/legacy/130/')
    ).toHaveLength(1);
    expect(parsed.some((tokens) => tokens[1] === '/sites/no-source/')).toBe(
      false
    );
  });

  it('maps legacy editorial pages to their new routes', () => {
    expect(rules(body)).toContainEqual([
      '/ndwt/water_safety/reading_rivers.asp',
      '/water-safety/reading-the-rivers/',
      '301',
    ]);
    expect(rules(body)).toContainEqual([
      '/ndwt/explore/lnt.asp',
      '/leave-no-trace/',
      '301',
    ]);
  });

  it('puts specific rules before the catch-alls that shadow them', () => {
    expect(indexOf(body, '/sites/legacy/130/')).toBeLessThan(
      indexOf(body, '/sites/legacy/*')
    );
    expect(indexOf(body, '/ndwt/explore/lnt.asp')).toBeLessThan(
      indexOf(body, '/ndwt/explore/*')
    );
    expect(indexOf(body, '/ndwt/water_safety/weather.asp')).toBeLessThan(
      indexOf(body, '/ndwt/water_safety/*')
    );
    const last = rules(body).at(-2);
    expect(last?.[0]).toBe('/ndwt/*');
  });

  it('emits only 301s', () => {
    for (const tokens of rules(body)) expect(tokens.at(-1)).toBe('301');
  });
});
