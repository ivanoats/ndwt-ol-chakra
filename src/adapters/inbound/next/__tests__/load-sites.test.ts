import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));
vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
  default: { readFile: mockReadFile },
}));

import { loadSites } from '../load-sites';

const validGeoJson = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        'web-scraper-order': 'abc-1',
        riverName: 'Columbia',
        riverMile: '234',
      },
      geometry: { type: 'Point', coordinates: [-120.37, 45.695] },
    },
  ],
});

const validEnriched = JSON.stringify({
  'abc-1': {
    name: 'Blalock Canyon',
    state: 'OR',
  },
});

const enoent = (): NodeJS.ErrnoException => {
  const err = new Error('ENOENT') as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return err;
};

const stubReads = (geojson: string, enriched: string | Error): void => {
  mockReadFile.mockImplementation(async (path: string) => {
    if (path.endsWith('ndwt.geojson')) return geojson;
    if (path.endsWith('ndwt-enriched.json')) {
      if (enriched instanceof Error) throw enriched;
      return enriched;
    }
    throw new Error(`unexpected read: ${path}`);
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSites', () => {
  it('reads GeoJSON from public/data and returns a parsed Site[]', async () => {
    stubReads(validGeoJson, validEnriched);
    const sites = await loadSites();
    expect(sites).toHaveLength(1);
    expect(sites[0]?.riverName).toBe('Columbia');
    expect(sites[0]?.coordinates.longitude).toBe(-120.37);
  });

  it('reads from process.cwd()/public/data/ndwt.geojson', async () => {
    stubReads(validGeoJson, validEnriched);
    await loadSites();
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('public/data/ndwt.geojson'),
      'utf-8'
    );
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('public/data/ndwt-enriched.json'),
      'utf-8'
    );
  });

  it('merges enriched name + state into the parsed Site', async () => {
    stubReads(validGeoJson, validEnriched);
    const sites = await loadSites();
    expect(sites[0]?.name).toBe('Blalock Canyon');
    expect(sites[0]?.state).toBe('OR');
  });

  it('falls back to "RiverName River — Mile NN" when the enriched file is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubReads(validGeoJson, enoent());
    const sites = await loadSites();
    expect(sites[0]?.name).toBe('Columbia River — Mile 234');
    expect(sites[0]?.state).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No enriched data')
    );
    warnSpy.mockRestore();
  });

  it('falls back when the enriched file lacks a record for this id', async () => {
    stubReads(
      validGeoJson,
      JSON.stringify({ 'other-id': { name: 'Some Other Site' } })
    );
    const sites = await loadSites();
    expect(sites[0]?.name).toBe('Columbia River — Mile 234');
  });

  it('throws a path-bearing error on JSON parse failure', async () => {
    stubReads('{not json', validEnriched);
    await expect(loadSites()).rejects.toThrow(/Failed to parse GeoJSON at/);
  });

  it('wraps enriched-JSON parse errors with a useful path', async () => {
    stubReads(validGeoJson, '{not json');
    await expect(loadSites()).rejects.toThrow(
      /Failed to parse enriched site data at/
    );
  });

  it('propagates fs errors as-is on the GeoJSON read', async () => {
    const err = new Error('boom');
    mockReadFile.mockImplementation(async (path: string) => {
      if (path.endsWith('ndwt.geojson')) throw err;
      return validEnriched;
    });
    await expect(loadSites()).rejects.toBe(err);
  });
});
