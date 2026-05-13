// Browser-side helpers for the offline tile cache UI.
//
// All Cache Storage interaction is centralised here so the React
// components stay declarative and the unit tests can hit pure logic
// with a mocked `caches` global. The prefix matches the SW's
// CACHE_NAME shape — bumping the SW's version creates a new bucket
// (`ndwt-tiles-v2`, etc.) that the activate handler purges. We also
// clear anything in the prefix so a stale-version cache left around
// by a partially-completed upgrade gets nuked from the UI too.

import type { Map as OlMap } from 'ol';
import TileLayer from 'ol/layer/Tile';
import UrlTile from 'ol/source/UrlTile';

export const TILE_CACHE_PREFIX = 'ndwt-tiles-';

export interface CacheStats {
  /** Number of tile entries summed across every `ndwt-tiles-*` cache. */
  readonly tileCount: number;
  /**
   * Estimated bytes used by tile caches. Derived from
   * `navigator.storage.estimate().usage` when available — that
   * counts the whole origin's storage, which on this site is
   * dominated by the tile cache because the static export has no
   * IndexedDB or localStorage of meaningful size. Falls back to 0
   * when the StorageManager API is unavailable (older browsers,
   * private mode in some engines).
   */
  readonly byteEstimate: number;
}

const EMPTY_STATS: CacheStats = Object.freeze({
  tileCount: 0,
  byteEstimate: 0,
});

function hasCachesApi(): boolean {
  return typeof globalThis !== 'undefined' && 'caches' in globalThis;
}

async function listTileCacheNames(): Promise<readonly string[]> {
  const keys = await caches.keys();
  return keys.filter((k) => k.startsWith(TILE_CACHE_PREFIX));
}

export async function getCacheStats(): Promise<CacheStats> {
  if (!hasCachesApi()) return EMPTY_STATS;
  try {
    const names = await listTileCacheNames();
    let tileCount = 0;
    for (const name of names) {
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      tileCount += reqs.length;
    }
    let byteEstimate = 0;
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      // `estimate()` returns a wider type than the spec — `usage` is
      // optional and can be undefined in some environments. Coerce to
      // number with `?? 0` so the UI doesn't have to special-case it.
      const estimate = await navigator.storage.estimate();
      byteEstimate = estimate.usage ?? 0;
    }
    return { tileCount, byteEstimate };
  } catch {
    // A cache read failure shouldn't block the drawer rendering.
    // Returning empty stats lets the UI show "0 tiles" rather than
    // throwing inside a useEffect.
    return EMPTY_STATS;
  }
}

export async function clearTileCaches(): Promise<number> {
  if (!hasCachesApi()) return 0;
  const names = await listTileCacheNames();
  await Promise.all(names.map((name) => caches.delete(name)));
  return names.length;
}

const BYTES_IN_KIB = 1024;
const BYTES_IN_MIB = BYTES_IN_KIB * 1024;
const BYTES_IN_GIB = BYTES_IN_MIB * 1024;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes >= BYTES_IN_GIB) {
    return `${(bytes / BYTES_IN_GIB).toFixed(2)} GB`;
  }
  if (bytes >= BYTES_IN_MIB) {
    return `${(bytes / BYTES_IN_MIB).toFixed(1)} MB`;
  }
  if (bytes >= BYTES_IN_KIB) {
    return `${(bytes / BYTES_IN_KIB).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

export interface PrewarmProgress {
  readonly total: number;
  readonly fetched: number;
  readonly failed: number;
}

export interface PrewarmResult extends PrewarmProgress {
  /** True if every URL came back with a non-error response. */
  readonly ok: boolean;
}

/**
 * Fetch every URL serially with a small concurrency cap so we don't
 * overwhelm tile-host rate limits or the device's network stack.
 *
 * Each fetch is "fire-and-forget" from the caller's perspective —
 * the response is read enough for the SW to write to cache (the SW's
 * `fetch` handler clones into the cache before the response reaches
 * us) and then dropped on the floor. We never decode tile bytes
 * here; the only goal is to populate the cache.
 *
 * `onProgress` fires after every URL settles (success OR failure)
 * so the UI can render a counter without each callback re-rendering
 * mid-fetch.
 */
export async function prewarmTiles(
  urls: readonly string[],
  options: {
    readonly signal?: AbortSignal;
    readonly concurrency?: number;
    readonly onProgress?: (p: PrewarmProgress) => void;
  } = {}
): Promise<PrewarmResult> {
  const { signal, concurrency = 4, onProgress } = options;
  const total = urls.length;
  let fetched = 0;
  let failed = 0;

  if (total === 0) {
    return { total: 0, fetched: 0, failed: 0, ok: true };
  }

  // Simple bounded-parallel worker pool. Each worker pulls the next
  // URL off a shared index and fetches it; when the index runs out
  // the worker resolves. This avoids the all-at-once `Promise.all`
  // pattern that would fire `total` concurrent requests at zoom-13
  // viewports (could easily be 64+ tiles per layer).
  let cursor = 0;
  const next = (): string | null => {
    if (cursor >= total) return null;
    const url = urls[cursor];
    cursor += 1;
    return url ?? null;
  };

  const worker = async (): Promise<void> => {
    let url = next();
    while (url !== null) {
      if (signal?.aborted === true) return;
      try {
        const res = await fetch(url, { signal });
        // Treat non-2xx as a failure for the counter; the SW already
        // declined to cache it. We don't surface which tiles failed —
        // the e2e network-blocked scenario covers full-fail visually.
        if (!res.ok) failed += 1;
      } catch {
        failed += 1;
      }
      fetched += 1;
      onProgress?.({ total, fetched, failed });
      url = next();
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, total) }, () =>
    worker()
  );
  await Promise.all(workers);

  return { total, fetched, failed, ok: failed === 0 };
}

/**
 * Duck-typed shape of a visible tile-source-with-grid. Lifted out of
 * the OL-specific wrapper so the per-layer URL math is testable in
 * jsdom without constructing real OL Map / Source instances. Extent
 * and projection are typed loose-ly because OL's types are mutable
 * and a tight interface here would clash with OL's variance at the
 * `tileUrlsForMap` call site — the helper doesn't mutate either.
 */
export interface TileRangeLike {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface VisibleTileSource<P> {
  readonly getTileGrid: () => {
    readonly getTileRangeForExtentAndZ: (
      extent: number[],
      z: number
    ) => TileRangeLike;
  } | null;
  readonly getTileUrlFunction: () => (
    coord: [number, number, number],
    pixelRatio: number,
    projection: P
  ) => string | undefined;
}

export interface TileEnumerationContext<P> {
  readonly extent: number[];
  readonly z: number;
  readonly projection: P;
  readonly pixelRatio?: number;
}

/**
 * Pure helper — given the visible tile sources and the viewport
 * geometry, expand every (z, x, y) into a URL string. No OL classes
 * involved, so vitest can exercise this directly. The `P` generic
 * carries the projection type through opaquely (OL's `Projection`
 * in production, anything in tests) so we don't have to import OL
 * types into the pure helper.
 */
export function enumerateTileUrls<P>(
  sources: readonly VisibleTileSource<P>[],
  context: TileEnumerationContext<P>
): readonly string[] {
  const { extent, z, projection, pixelRatio = 1 } = context;
  const urls: string[] = [];
  for (const source of sources) {
    const grid = source.getTileGrid();
    if (grid === null) continue;
    const range = grid.getTileRangeForExtentAndZ(extent, z);
    const tileUrlFn = source.getTileUrlFunction();
    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        const url = tileUrlFn([z, x, y], pixelRatio, projection);
        if (typeof url === 'string') urls.push(url);
      }
    }
  }
  return urls;
}

/**
 * Enumerate the tile URLs that cover the map's current viewport for
 * every visible tile layer. Used by the "Save current view" action
 * to pre-warm the SW cache.
 *
 * Notes on OL internals:
 *  - `getTileGrid()` can return `null` for sources that haven't been
 *    fully initialised; we skip those.
 *  - `getTileUrlFunction()` is the source of truth for the URL
 *    template even when the source was constructed with `url:` —
 *    OSM, XYZ, and the WMTS sources all expose it identically.
 *  - `pixelRatio` is fixed at 1; OL would request `@2x` URLs on
 *    HiDPI screens for some sources, but the project's sources don't
 *    define `tilePixelRatio`, so 1 matches what OL itself fetches.
 *
 * This function exists as the OL-aware glue around `enumerateTileUrls`
 * — `instanceof` narrowing happens here so the loop math stays pure.
 * Covered by the Playwright e2e (an OL canvas can't render in jsdom).
 */
/* c8 ignore start */
export function tileUrlsForMap(map: OlMap): readonly string[] {
  const view = map.getView();
  const projection = view.getProjection();
  const size = map.getSize();
  if (size === undefined) return [];
  const extent = view.calculateExtent(size);
  const zoom = view.getZoom();
  if (zoom === undefined) return [];
  const z = Math.round(zoom);

  const sources: VisibleTileSource<typeof projection>[] = [];
  for (const layer of map.getLayers().getArray()) {
    if (!(layer instanceof TileLayer) || !layer.getVisible()) continue;
    const source = layer.getSource();
    // Narrow to UrlTile — the parent of OSM, XYZ, TileImage, etc.
    // and the class that owns `getTileUrlFunction`. The project
    // doesn't use non-UrlTile sources (e.g. ImageWMS), so anything
    // that fails the instanceof check is something we don't know
    // how to enumerate URLs for and can safely skip.
    if (!(source instanceof UrlTile)) continue;
    sources.push(source);
  }
  return enumerateTileUrls(sources, { extent, z, projection });
}
/* c8 ignore stop */
