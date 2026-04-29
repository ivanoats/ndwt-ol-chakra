import { describe, expect, it } from 'vitest';

import { coordinates } from '../coordinates';
import { type Facility, FacilitySet } from '../facility';
import { type Site, siteId } from '../site';
import {
  collectRivers,
  emptyFilter,
  filterSites,
  sortSites,
} from '../site-filter';

const make = (
  partial: Partial<Site> & Pick<Site, 'name' | 'riverName' | 'riverMile'>
): Site => ({
  id: siteId(partial.name.toLowerCase().replaceAll(' ', '-')),
  slug: partial.name.toLowerCase().replaceAll(' ', '-'),
  riverSegment: '',
  bank: '',
  coordinates: coordinates(0, 0),
  facilities: FacilitySet.empty(),
  ...partial,
});

const fixtures: readonly Site[] = [
  make({ name: 'Blalock Canyon', riverName: 'Columbia', riverMile: 234 }),
  make({
    name: 'Hood Park',
    riverName: 'Snake',
    riverMile: 2,
    facilities: FacilitySet.fromFlags({ boatRamp: true, restrooms: true }),
  }),
  make({
    name: 'Hells Gate State Park',
    riverName: 'Snake',
    riverMile: 142,
    facilities: FacilitySet.fromFlags({ boatRamp: true, marina: true }),
  }),
  make({ name: 'Canoe Camp', riverName: 'Clearwater', riverMile: 1 }),
  make({
    name: 'Avery Park',
    riverName: 'Columbia',
    riverMile: 220,
    facilities: FacilitySet.fromFlags({ restrooms: true }),
  }),
];

describe('filterSites', () => {
  it('returns the input unchanged for the empty filter', () => {
    expect(filterSites(fixtures, emptyFilter)).toEqual(fixtures);
  });

  it('matches names case-insensitively as a substring', () => {
    const result = filterSites(fixtures, { ...emptyFilter, query: 'BLAL' });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Blalock Canyon');
  });

  it('narrows by river', () => {
    const result = filterSites(fixtures, { ...emptyFilter, river: 'Snake' });
    expect(result.map((s) => s.name)).toEqual([
      'Hood Park',
      'Hells Gate State Park',
    ]);
  });

  it('AND-combines facility filters (every facility must be present)', () => {
    const facilities = new Set<Facility>(['boatRamp', 'marina']);
    const result = filterSites(fixtures, { ...emptyFilter, facilities });
    expect(result.map((s) => s.name)).toEqual(['Hells Gate State Park']);
  });

  it('combines query + river + facilities', () => {
    const facilities = new Set<Facility>(['restrooms']);
    const result = filterSites(fixtures, {
      query: 'park',
      river: 'Columbia',
      facilities,
    });
    expect(result.map((s) => s.name)).toEqual(['Avery Park']);
  });
});

describe('sortSites', () => {
  it('default river-mile groups by river name then ascending mile', () => {
    const result = sortSites(fixtures, 'river-mile');
    expect(result.map((s) => s.name)).toEqual([
      'Canoe Camp', // Clearwater 1
      'Avery Park', // Columbia 220
      'Blalock Canyon', // Columbia 234
      'Hood Park', // Snake 2
      'Hells Gate State Park', // Snake 142
    ]);
  });

  it('alpha sorts by name', () => {
    const result = sortSites(fixtures, 'alpha');
    expect(result.map((s) => s.name)).toEqual([
      'Avery Park',
      'Blalock Canyon',
      'Canoe Camp',
      'Hells Gate State Park',
      'Hood Park',
    ]);
  });

  it('does not mutate the input array', () => {
    const before = fixtures.map((s) => s.name);
    sortSites(fixtures, 'alpha');
    expect(fixtures.map((s) => s.name)).toEqual(before);
  });
});

describe('collectRivers', () => {
  it('returns distinct river names sorted alphabetically', () => {
    expect(collectRivers(fixtures)).toEqual([
      'Clearwater',
      'Columbia',
      'Snake',
    ]);
  });

  it('drops empty river names', () => {
    const withBlank = [
      ...fixtures,
      make({ name: 'No River', riverName: '', riverMile: 0 }),
    ];
    expect(collectRivers(withBlank)).toEqual([
      'Clearwater',
      'Columbia',
      'Snake',
    ]);
  });
});
