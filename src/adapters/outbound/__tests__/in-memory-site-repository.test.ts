import { describe, expect, it } from 'vitest';

import { coordinates, FacilitySet, type Site, siteId } from '../../../domain';
import { InMemorySiteRepository } from '../in-memory-site-repository';

const makeSite = (id: string, riverName = 'Columbia'): Site => ({
  id: siteId(id),
  name: `${riverName} River — Mile 0`,
  slug: `${riverName.toLowerCase()}-river-mile-0`,
  riverSegment: '',
  riverName,
  riverMile: 0,
  bank: '',
  coordinates: coordinates(0, 0),
  facilities: FacilitySet.empty(),
});

describe('InMemorySiteRepository', () => {
  it('list() resolves to the array passed in', async () => {
    const sites = [makeSite('a'), makeSite('b')];
    const repo = new InMemorySiteRepository(sites);
    await expect(repo.list()).resolves.toEqual(sites);
  });

  it('findById() returns the matching site', async () => {
    const first = makeSite('a', 'Columbia');
    const second = makeSite('b', 'Snake');
    const repo = new InMemorySiteRepository([first, second]);
    await expect(repo.findById(siteId('b'))).resolves.toBe(second);
  });

  it('findById() returns null for an unknown id', async () => {
    const repo = new InMemorySiteRepository([makeSite('a')]);
    await expect(repo.findById(siteId('nope'))).resolves.toBeNull();
  });

  it('findById() handles empty repo', async () => {
    const repo = new InMemorySiteRepository([]);
    await expect(repo.findById(siteId('any'))).resolves.toBeNull();
  });
});
