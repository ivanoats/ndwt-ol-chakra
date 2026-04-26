import { describe, expect, it } from 'vitest';

import { FACILITIES, FacilitySet } from '../facility';

describe('FacilitySet', () => {
  it('empty() has size 0 and reports no facilities', () => {
    const set = FacilitySet.empty();
    expect(set.size).toBe(0);
    for (const facility of FACILITIES) {
      expect(set.has(facility)).toBe(false);
    }
  });

  it('fromFlags() includes only truthy flags', () => {
    const set = FacilitySet.fromFlags({
      restrooms: true,
      boatRamp: true,
      marina: false,
    });
    expect(set.has('restrooms')).toBe(true);
    expect(set.has('boatRamp')).toBe(true);
    expect(set.has('marina')).toBe(false);
    expect(set.has('adaAccess')).toBe(false);
    expect(set.size).toBe(2);
  });

  it('toArray() preserves canonical FACILITIES order', () => {
    const set = FacilitySet.fromFlags({
      adaAccess: true,
      restrooms: true,
      marina: true,
    });
    expect(set.toArray()).toEqual(['restrooms', 'marina', 'adaAccess']);
  });

  it('fromFlags() with empty input is empty', () => {
    expect(FacilitySet.fromFlags({}).size).toBe(0);
  });
});
