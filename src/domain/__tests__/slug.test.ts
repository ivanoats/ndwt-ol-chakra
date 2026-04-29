import { describe, expect, it } from 'vitest';

import { __test, assignSlugs, type SluggableSite } from '../slug';

describe('baseSlug', () => {
  const { baseSlug } = __test;

  it('kebab-cases an ASCII name', () => {
    expect(baseSlug('Blalock Canyon')).toBe('blalock-canyon');
  });

  it('collapses runs of non-alphanumerics into single dashes', () => {
    expect(baseSlug("Harper's Bend")).toBe('harper-s-bend');
    expect(baseSlug('Big   Flat')).toBe('big-flat');
    expect(baseSlug('Bonneville(Oregon )')).toBe('bonneville-oregon');
  });

  it('strips leading/trailing dashes', () => {
    expect(baseSlug('  Site  ')).toBe('site');
    expect(baseSlug('???')).toBe('site');
  });
});

describe('assignSlugs collision strategy', () => {
  it('uses the bare name slug when unique', () => {
    const sites: SluggableSite[] = [
      { id: 'a', name: 'Blalock Canyon', riverMile: 234 },
      { id: 'b', name: "Harper's Bend", riverMile: 34 },
    ];
    const slugs = assignSlugs(sites);
    expect(slugs.get('a')).toBe('blalock-canyon');
    expect(slugs.get('b')).toBe('harper-s-bend');
  });

  it('disambiguates with river mile when names collide on different miles', () => {
    const sites: SluggableSite[] = [
      { id: 'a', name: 'Hood Park', riverMile: 2 },
      { id: 'b', name: 'Hood Park', riverMile: 2.5 },
    ];
    const slugs = assignSlugs(sites);
    expect(slugs.get('a')).toBe('hood-park-mile-2');
    expect(slugs.get('b')).toBe('hood-park-mile-2-5');
  });

  it('falls back to id when names AND miles collide', () => {
    const sites: SluggableSite[] = [
      { id: '188', name: 'Granite Point', riverMile: 113 },
      { id: '182', name: 'Granite Point', riverMile: 113 },
    ];
    const slugs = assignSlugs(sites);
    expect(slugs.get('188')).toBe('granite-point-mile-113-188');
    expect(slugs.get('182')).toBe('granite-point-mile-113-182');
  });

  it('handles a mix of unique and colliding names in one batch', () => {
    const sites: SluggableSite[] = [
      { id: '1', name: 'Blalock Canyon', riverMile: 234 },
      { id: '2', name: 'Hood Park', riverMile: 2 },
      { id: '3', name: 'Hood Park', riverMile: 2.5 },
      { id: '4', name: 'Granite Point', riverMile: 113 },
      { id: '5', name: 'Granite Point', riverMile: 113 },
    ];
    const slugs = assignSlugs(sites);
    expect(slugs.get('1')).toBe('blalock-canyon');
    expect(slugs.get('2')).toBe('hood-park-mile-2');
    expect(slugs.get('3')).toBe('hood-park-mile-2-5');
    expect(slugs.get('4')).toBe('granite-point-mile-113-4');
    expect(slugs.get('5')).toBe('granite-point-mile-113-5');
  });

  it('produces unique slugs across the dataset (no two sites share a slug)', () => {
    const sites: SluggableSite[] = [
      { id: '1', name: 'Hood Park', riverMile: 2 },
      { id: '2', name: 'Hood Park', riverMile: 2 }, // exact duplicate
      { id: '3', name: 'Hood Park', riverMile: 2 }, // 3-way collision
    ];
    const slugs = assignSlugs(sites);
    const unique = new Set(slugs.values());
    expect(unique.size).toBe(3);
  });
});
