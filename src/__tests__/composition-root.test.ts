import { describe, expect, it } from 'vitest';

import { createComposition } from '../composition-root';
import { coordinates, FacilitySet, type Site, siteId } from '../domain';

const baseSite: Site = {
  id: siteId('a'),
  name: 'Site A',
  riverSegment: '',
  riverName: 'Columbia',
  riverMile: 0,
  bank: '',
  coordinates: coordinates(0, 0),
  facilities: FacilitySet.empty(),
};

describe('createComposition', () => {
  it('exposes wired listSites and getSite use cases', async () => {
    const composition = createComposition([baseSite]);
    await expect(composition.listSites()).resolves.toEqual([baseSite]);
    await expect(composition.getSite(siteId('a'))).resolves.toBe(baseSite);
    await expect(composition.getSite(siteId('z'))).resolves.toBeNull();
  });

  it('returns isolated compositions per call (no shared state)', async () => {
    const populated = createComposition([baseSite]);
    const empty = createComposition([]);
    await expect(populated.listSites()).resolves.toEqual([baseSite]);
    await expect(empty.listSites()).resolves.toEqual([]);
  });
});
