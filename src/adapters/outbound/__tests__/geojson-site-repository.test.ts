import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { __test, GeoJsonSiteRepository } from '../geojson-site-repository';

const here = dirname(fileURLToPath(import.meta.url));

let geojsonText: string;

beforeAll(async () => {
  geojsonText = await readFile(
    resolve(here, '../../../../public/data/ndwt.geojson'),
    'utf-8'
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const okResponse = (): Response => new Response(geojsonText, { status: 200 });

const stubFetchOk = (): ReturnType<typeof vi.fn> => {
  const mock = vi.fn().mockResolvedValue(okResponse());
  vi.stubGlobal('fetch', mock);
  return mock;
};

describe('GeoJsonSiteRepository.list()', () => {
  it('parses every feature in the real dataset', async () => {
    stubFetchOk();
    const repo = new GeoJsonSiteRepository('/data/ndwt.geojson');
    const sites = await repo.list();

    expect(sites.length).toBeGreaterThan(100);
    expect(sites.length).toBeLessThan(300);

    for (const site of sites) {
      expect(typeof site.id).toBe('string');
      expect(site.id.length).toBeGreaterThan(0);
      expect(site.name.length).toBeGreaterThan(0);
      expect(site.coordinates.longitude).toBeGreaterThan(-180);
      expect(site.coordinates.longitude).toBeLessThan(180);
      expect(site.coordinates.latitude).toBeGreaterThan(-90);
      expect(site.coordinates.latitude).toBeLessThan(90);
    }
  });

  it('caches the result so repeated list() calls do not refetch', async () => {
    const fetchMock = stubFetchOk();
    const repo = new GeoJsonSiteRepository('/data/ndwt.geojson');
    await repo.list();
    await repo.list();
    await repo.list();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('findById returns the site when present and null otherwise', async () => {
    stubFetchOk();
    const repo = new GeoJsonSiteRepository('/data/ndwt.geojson');
    const all = await repo.list();
    const first = all[0];
    if (!first) throw new Error('expected at least one site');

    const found = await repo.findById(first.id);
    expect(found?.id).toBe(first.id);

    const missing = await repo.findById('does-not-exist' as typeof first.id);
    expect(missing).toBeNull();
  });

  it('throws on non-OK fetch response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 }))
    );
    const repo = new GeoJsonSiteRepository('/data/ndwt.geojson');
    await expect(repo.list()).rejects.toThrow(/500/);
  });

  it('retries after a failed fetch (does not pin a rejected inflight promise)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('boom', { status: 503 }))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const repo = new GeoJsonSiteRepository('/data/ndwt.geojson');
    await expect(repo.list()).rejects.toThrow(/503/);
    const sites = await repo.list();
    expect(sites.length).toBeGreaterThan(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('toSite mapper', () => {
  it('handles missing optional fields without throwing', () => {
    const feature = {
      type: 'Feature' as const,
      properties: {
        riverName: 'Columbia',
        riverSegment: 'Lake Umatilla',
        riverMile: '234',
        bank: 'OR',
        'restrooms-src': '0',
        'boatRamp-src': '1',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-120.37, 45.695] as [number, number],
      },
    };
    const site = __test.toSite(feature, 0);
    expect(site.coordinates).toEqual({ longitude: -120.37, latitude: 45.695 });
    expect(site.facilities).not.toContain('restrooms');
    expect(site.facilities).toContain('boatRamp');
    expect(site.season).toBeUndefined();
    expect(site.contact).toBeUndefined();
    expect(site.riverMile).toBe(234);
  });

  it('falls back to a generated id when web-scraper-order is missing', () => {
    const feature = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Point' as const,
        coordinates: [0, 0] as [number, number],
      },
    };
    const site = __test.toSite(feature, 42);
    expect(site.id).toBe('site-42');
    expect(site.riverMile).toBe(0);
  });

  it('uses the river-and-mile fallback name when no enriched record exists', () => {
    const feature = {
      type: 'Feature' as const,
      properties: {
        'web-scraper-order': '1639846015-81',
        riverName: 'Columbia',
        riverMile: '234',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-120.37, 45.695] as [number, number],
      },
    };
    const site = __test.toSite(feature, 0);
    expect(site.name).toBe('Columbia River — Mile 234');
    expect(site.state).toBeUndefined();
    expect(site.notes).toBeUndefined();
  });

  it('prefers the enriched record name and merges in optional fields', () => {
    const feature = {
      type: 'Feature' as const,
      properties: {
        'web-scraper-order': '1639845856-12',
        riverName: 'Clearwater',
        riverMile: '34',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-116.45002, 46.49144] as [number, number],
      },
    };
    const enriched = {
      '1639845856-12': {
        name: "Harper's Bend",
        state: 'ID',
        county: 'Nez Perce',
        notes: 'Popular site for fishing.',
      },
    };
    const site = __test.toSite(feature, 0, enriched);
    expect(site.name).toBe("Harper's Bend");
    expect(site.state).toBe('ID');
    expect(site.county).toBe('Nez Perce');
    expect(site.notes).toBe('Popular site for fishing.');
    expect(site.campingFee).toBeUndefined();
  });
});
