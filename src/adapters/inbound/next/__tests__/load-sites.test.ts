import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
        name: 'Blalock Canyon',
        riverName: 'Columbia',
        riverMile: '234',
        state: 'OR',
      },
      geometry: { type: 'Point', coordinates: [-120.37, 45.695] },
    },
  ],
});

beforeEach(() => {
  mockReadFile.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSites', () => {
  it('reads GeoJSON from public/data and returns a parsed Site[]', async () => {
    mockReadFile.mockResolvedValue(validGeoJson);
    const sites = await loadSites();
    expect(sites).toHaveLength(1);
    expect(sites[0]?.name).toBe('Blalock Canyon');
    expect(sites[0]?.state).toBe('OR');
    expect(sites[0]?.coordinates.longitude).toBe(-120.37);
  });

  it('reads from process.cwd()/public/data/ndwt.geojson', async () => {
    mockReadFile.mockResolvedValue(validGeoJson);
    await loadSites();
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('public/data/ndwt.geojson'),
      'utf-8'
    );
    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it('throws a path-bearing error on JSON parse failure', async () => {
    mockReadFile.mockResolvedValue('{not json');
    await expect(loadSites()).rejects.toThrow(/Failed to parse GeoJSON at/);
  });

  it('propagates fs errors as-is', async () => {
    const err = new Error('boom');
    mockReadFile.mockRejectedValue(err);
    await expect(loadSites()).rejects.toBe(err);
  });
});
