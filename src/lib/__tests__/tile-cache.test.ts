import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import {
  clearTileCaches,
  enumerateTileUrls,
  formatBytes,
  getCacheStats,
  prewarmTiles,
  TILE_CACHE_PREFIX,
  type VisibleTileSource,
} from '../tile-cache';

// jsdom doesn't implement Cache Storage. We swap in a tiny mock that
// mirrors the surface tile-cache.ts actually touches: `caches.keys`,
// `caches.open`, `caches.delete`, plus a per-cache `keys` that
// returns Request-ish objects.

type CacheLike = { keys: () => Promise<readonly { url: string }[]> };

type CachesMock = {
  keys: () => Promise<readonly string[]>;
  open: (name: string) => Promise<CacheLike>;
  delete: (name: string) => Promise<boolean>;
};

function installCachesMock(buckets: Record<string, readonly string[]>): {
  caches: CachesMock;
  deleted: string[];
} {
  const deleted: string[] = [];
  const mock: CachesMock = {
    keys: () => Promise.resolve(Object.keys(buckets)),
    open: (name) =>
      Promise.resolve({
        keys: () =>
          Promise.resolve(
            (buckets[name] ?? []).map((u) => ({ url: u }) as { url: string })
          ),
      }),
    delete: (name) => {
      deleted.push(name);
      return Promise.resolve(true);
    },
  };
  Object.defineProperty(globalThis, 'caches', {
    value: mock,
    configurable: true,
    writable: true,
  });
  return { caches: mock, deleted };
}

function uninstallCachesMock(): void {
  delete (globalThis as { caches?: unknown }).caches;
}

const originalStorageDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'storage'
);

function installStorageEstimate(usage: number | undefined): void {
  Object.defineProperty(navigator, 'storage', {
    value: { estimate: () => Promise.resolve({ usage }) },
    configurable: true,
  });
}

function restoreNavigatorStorage(): void {
  if (originalStorageDescriptor === undefined) {
    delete (navigator as { storage?: unknown }).storage;
  } else {
    Object.defineProperty(navigator, 'storage', originalStorageDescriptor);
  }
}

afterEach(() => {
  uninstallCachesMock();
  restoreNavigatorStorage();
});

describe('formatBytes', () => {
  it('renders 0 as 0 MB so an empty cache reads naturally', () => {
    expect(formatBytes(0)).toBe('0 MB');
  });

  it('handles non-finite or negative input defensively', () => {
    expect(formatBytes(Number.NaN)).toBe('0 MB');
    expect(formatBytes(-1)).toBe('0 MB');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 MB');
  });

  it('uses B / KB / MB / GB at the right thresholds', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2 * 1024)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
    expect(formatBytes(2.25 * 1024 * 1024 * 1024)).toBe('2.25 GB');
  });
});

describe('getCacheStats', () => {
  it('returns empty stats when the Cache Storage API is unavailable', async () => {
    uninstallCachesMock();
    const stats = await getCacheStats();
    expect(stats).toEqual({ tileCount: 0, byteEstimate: 0 });
  });

  it('sums entries across ndwt-tiles-* caches and ignores other caches', async () => {
    installCachesMock({
      [`${TILE_CACHE_PREFIX}v1`]: ['https://a/tile/1', 'https://a/tile/2'],
      [`${TILE_CACHE_PREFIX}v0`]: ['https://b/tile/3'],
      // A foreign cache (e.g. another app's bucket) MUST NOT count.
      'some-other-cache': ['https://x'],
    });
    installStorageEstimate(15 * 1024 * 1024);

    const stats = await getCacheStats();
    expect(stats.tileCount).toBe(3);
    expect(stats.byteEstimate).toBe(15 * 1024 * 1024);
  });

  it('reports 0 bytes when navigator.storage is unavailable', async () => {
    installCachesMock({ [`${TILE_CACHE_PREFIX}v1`]: ['https://a/1'] });
    delete (navigator as { storage?: unknown }).storage;

    const stats = await getCacheStats();
    expect(stats.tileCount).toBe(1);
    expect(stats.byteEstimate).toBe(0);
  });

  it('falls back to empty stats on a cache-API failure', async () => {
    Object.defineProperty(globalThis, 'caches', {
      value: {
        keys: () => Promise.reject(new Error('boom')),
      },
      configurable: true,
    });
    const stats = await getCacheStats();
    expect(stats).toEqual({ tileCount: 0, byteEstimate: 0 });
  });
});

describe('clearTileCaches', () => {
  it('is a no-op when the Cache Storage API is unavailable', async () => {
    uninstallCachesMock();
    await expect(clearTileCaches()).resolves.toBe(0);
  });

  it('deletes every ndwt-tiles-* bucket and leaves foreign caches alone', async () => {
    const { deleted } = installCachesMock({
      [`${TILE_CACHE_PREFIX}v1`]: [],
      [`${TILE_CACHE_PREFIX}v0`]: [],
      'unrelated-cache': [],
    });
    const cleared = await clearTileCaches();
    expect(cleared).toBe(2);
    expect(deleted.sort()).toEqual(
      [`${TILE_CACHE_PREFIX}v0`, `${TILE_CACHE_PREFIX}v1`].sort()
    );
  });
});

describe('prewarmTiles', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  it('returns 0/0 immediately when there are no URLs to fetch', async () => {
    const result = await prewarmTiles([]);
    expect(result).toEqual({ total: 0, fetched: 0, failed: 0, ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fires onProgress after every URL settles and resolves with totals', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 200 }));
    const progressCalls: { fetched: number; failed: number }[] = [];

    const result = await prewarmTiles(
      ['https://a/1', 'https://a/2', 'https://a/3'],
      {
        concurrency: 2,
        onProgress: ({ fetched, failed }) =>
          progressCalls.push({ fetched, failed }),
      }
    );

    expect(result).toEqual({ total: 3, fetched: 3, failed: 0, ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    // Final progress matches the result.
    expect(progressCalls.at(-1)).toEqual({ fetched: 3, failed: 0 });
  });

  it('counts non-2xx responses as failures but keeps going', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 504 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await prewarmTiles(['a', 'b', 'c'], { concurrency: 1 });
    expect(result).toEqual({ total: 3, fetched: 3, failed: 1, ok: false });
  });

  it('counts thrown fetches as failures', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await prewarmTiles(['a', 'b'], { concurrency: 1 });
    expect(result).toEqual({ total: 2, fetched: 2, failed: 2, ok: false });
  });
});

describe('enumerateTileUrls', () => {
  // Build a fake VisibleTileSource that returns a configurable tile
  // range and a URL template. No OL classes involved.
  function fakeSource({
    range,
    template,
    grid = true,
  }: {
    readonly range: { minX: number; maxX: number; minY: number; maxY: number };
    readonly template: (
      tileZ: number,
      tileX: number,
      tileY: number
    ) => string | undefined;
    readonly grid?: boolean;
  }): VisibleTileSource<unknown> {
    return {
      getTileGrid: () =>
        grid
          ? {
              getTileRangeForExtentAndZ: () => range,
            }
          : null,
      getTileUrlFunction:
        () =>
        ([tileZ, tileX, tileY]: [number, number, number]) =>
          template(tileZ, tileX, tileY),
    };
  }

  it('expands every tile coord in the range into a URL', () => {
    const source = fakeSource({
      range: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      template: (tileZ, tileX, tileY) =>
        `https://example/${tileZ}/${tileX}/${tileY}.png`,
    });
    const urls = enumerateTileUrls([source], {
      extent: [0, 0, 1, 1],
      tileZ: 7,
      projection: null,
    });
    expect([...urls].sort()).toEqual(
      [
        'https://example/7/0/0.png',
        'https://example/7/0/1.png',
        'https://example/7/1/0.png',
        'https://example/7/1/1.png',
      ].sort()
    );
  });

  it('skips sources that have no tile grid yet', () => {
    const source = fakeSource({
      range: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      template: () => 'should-not-appear',
      grid: false,
    });
    expect(
      enumerateTileUrls([source], {
        extent: [0, 0, 1, 1],
        tileZ: 5,
        projection: 0,
      })
    ).toEqual([]);
  });

  it('drops any tile coord whose URL function returns undefined', () => {
    const source = fakeSource({
      range: { minX: 0, maxX: 1, minY: 0, maxY: 0 },
      // Returning undefined matches what OL's tileUrlFunction does
      // for coords outside a source's coverage area (eg. NOAA Charts
      // off-coast).
      template: (_tileZ, tileX) => (tileX === 0 ? 'a' : undefined),
    });
    const urls = enumerateTileUrls([source], {
      extent: [0, 0, 1, 1],
      tileZ: 3,
      projection: null,
    });
    expect(urls).toEqual(['a']);
  });

  it('returns an empty array when given no sources', () => {
    expect(
      enumerateTileUrls([], {
        extent: [0, 0, 1, 1],
        tileZ: 1,
        projection: null,
      })
    ).toEqual([]);
  });

  it('combines URLs from multiple sources (basemap + overlays)', () => {
    const base = fakeSource({
      range: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      template: (tileZ, tileX, tileY) =>
        `https://base/${tileZ}/${tileX}/${tileY}`,
    });
    const overlay = fakeSource({
      range: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      template: (tileZ, tileX, tileY) =>
        `https://overlay/${tileZ}/${tileX}/${tileY}`,
    });
    expect(
      enumerateTileUrls([base, overlay], {
        extent: [0, 0, 1, 1],
        tileZ: 4,
        projection: null,
      })
    ).toEqual(['https://base/4/0/0', 'https://overlay/4/0/0']);
  });
});

describe('prewarmTiles abort signal', () => {
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  it('stops dispatching new fetches once the signal is aborted', async () => {
    const controller = new AbortController();
    // Resolve the first fetch then abort before the second runs. The
    // worker loop checks `signal.aborted` between URLs, so the
    // second/third pulls return early.
    fetchSpy.mockImplementation(() => {
      controller.abort();
      return Promise.resolve(new Response(null, { status: 200 }));
    });

    const result = await prewarmTiles(['a', 'b', 'c'], {
      concurrency: 1,
      signal: controller.signal,
    });
    // The first URL completed before abort took effect; subsequent
    // pulls hit the early-return guard.
    expect(result.fetched).toBe(1);
  });
});
