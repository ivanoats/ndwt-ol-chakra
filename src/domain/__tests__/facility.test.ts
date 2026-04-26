import { describe, expect, it } from 'vitest';

import { FACILITIES, FacilitySet } from '../facility';

describe('FacilitySet', () => {
  it('empty() has size 0 and reports no facilities', () => {
    const s = FacilitySet.empty();
    expect(s.size).toBe(0);
    for (const f of FACILITIES) {
      expect(s.has(f)).toBe(false);
    }
  });

  it('fromFlags() includes only truthy flags', () => {
    const s = FacilitySet.fromFlags({
      restrooms: true,
      boatRamp: true,
      marina: false,
    });
    expect(s.has('restrooms')).toBe(true);
    expect(s.has('boatRamp')).toBe(true);
    expect(s.has('marina')).toBe(false);
    expect(s.has('adaAccess')).toBe(false);
    expect(s.size).toBe(2);
  });

  it('toArray() preserves canonical FACILITIES order', () => {
    const s = FacilitySet.fromFlags({
      adaAccess: true,
      restrooms: true,
      marina: true,
    });
    expect(s.toArray()).toEqual(['restrooms', 'marina', 'adaAccess']);
  });

  it('fromFlags() with empty input is empty', () => {
    expect(FacilitySet.fromFlags({}).size).toBe(0);
  });
});
