import { describe, expect, it } from 'vitest';

import { FACILITIES, FacilitySet, hasFacility } from '../facility';

describe('FacilitySet', () => {
  it('empty() has length 0 and reports no facilities', () => {
    const set = FacilitySet.empty();
    expect(set.length).toBe(0);
    for (const facility of FACILITIES) {
      expect(hasFacility(set, facility)).toBe(false);
    }
  });

  it('fromFlags() includes only truthy flags', () => {
    const set = FacilitySet.fromFlags({
      restrooms: true,
      boatRamp: true,
      marina: false,
    });
    expect(hasFacility(set, 'restrooms')).toBe(true);
    expect(hasFacility(set, 'boatRamp')).toBe(true);
    expect(hasFacility(set, 'marina')).toBe(false);
    expect(hasFacility(set, 'adaAccess')).toBe(false);
    expect(set.length).toBe(2);
  });

  it('fromFlags() preserves canonical FACILITIES order', () => {
    const set = FacilitySet.fromFlags({
      adaAccess: true,
      restrooms: true,
      marina: true,
    });
    expect(set).toEqual(['restrooms', 'marina', 'adaAccess']);
  });

  it('fromFlags() with empty input is empty', () => {
    expect(FacilitySet.fromFlags({}).length).toBe(0);
  });
});
