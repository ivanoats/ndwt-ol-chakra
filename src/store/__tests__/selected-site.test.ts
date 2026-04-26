import { beforeEach, describe, expect, it } from 'vitest';

import { coordinates, FacilitySet, type Site, siteId } from '../../domain';
import { useSelectedSite } from '../selected-site';

const fakeSite = (id: string): Site => ({
  id: siteId(id),
  riverSegment: 'Lake Umatilla',
  riverName: 'Columbia',
  riverMile: 234,
  bank: 'OR',
  coordinates: coordinates(-120.37, 45.695),
  facilities: FacilitySet.empty(),
});

describe('useSelectedSite store', () => {
  beforeEach(() => {
    useSelectedSite.getState().close();
  });

  it('starts with no selected site', () => {
    expect(useSelectedSite.getState().selectedSite).toBeNull();
  });

  it('select() puts the site in state', () => {
    const site = fakeSite('a');
    useSelectedSite.getState().select(site);
    expect(useSelectedSite.getState().selectedSite).toBe(site);
  });

  it('close() clears the selection', () => {
    useSelectedSite.getState().select(fakeSite('a'));
    useSelectedSite.getState().close();
    expect(useSelectedSite.getState().selectedSite).toBeNull();
  });

  it('select() replaces a previous selection', () => {
    const a = fakeSite('a');
    const b = fakeSite('b');
    useSelectedSite.getState().select(a);
    useSelectedSite.getState().select(b);
    expect(useSelectedSite.getState().selectedSite).toBe(b);
  });
});
