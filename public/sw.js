// Service worker — caches basemap and overlay tiles cache-first so
// the map keeps working offline (and so subsequent visits skip the
// network round-trip for previously-loaded tiles). The big win is
// for paddlers using NDWT in cell-dead reaches of the Columbia /
// Snake: pre-load a planned route's tiles on WiFi at home, then run
// the map without a signal on the river.
//
// Scope: ONLY cross-origin tile requests to the known basemap /
// overlay hosts are intercepted. Everything else (Next assets, the
// GeoJSON, app bundles) is left to the browser's default handling,
// which Next + Netlify already cache-control correctly.
//
// Strategy: cache-first with network fallback. On a cache miss, the
// SW fetches from the network, returns the response to the page,
// and writes a clone into the cache. Subsequent requests for the
// same tile are served from the cache without a network round-trip.
//
// No explicit eviction in this version — the browser will LRU-evict
// caches under storage pressure. A future PR can add a hard size
// cap + UI to manually clear (tracked in #64 Tier 3b).
//
// Version invalidation: bump CACHE_NAME's version suffix to force
// a clean install. The `activate` handler deletes any cache whose
// name doesn't match the current version.

const CACHE_NAME = 'ndwt-tiles-v1';

const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'basemap.nationalmap.gov',
  'a.tile.opentopomap.org',
  'b.tile.opentopomap.org',
  'c.tile.opentopomap.org',
  'tiles.openseamap.org',
  'tile.waymarkedtrails.org',
];

function isTileRequest(url) {
  // The URL constructor here only handles absolute URLs — we don't
  // pass a base. That's fine because every request that reaches the
  // SW's `fetch` event has an absolute `request.url`, and we only
  // care about cross-origin tile hosts. A relative URL would throw
  // and fall through to `false`, which is the right answer (don't
  // intercept).
  try {
    const parsed = new URL(url);
    return TILE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  // Activate the new SW immediately on install instead of waiting
  // for the old one to release control. Tile content doesn't change
  // shape between SW versions, so there's no risk of the new SW
  // serving incompatible cached data.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old cache versions left over from previous SW
      // installs. Anything that isn't CACHE_NAME gets dropped.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('ndwt-tiles-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      // Take control of pages that loaded before this SW activated.
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only intercept GETs to known tile hosts; everything else
  // passes through to the browser's default handling.
  if (request.method !== 'GET' || !isTileRequest(request.url)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        // Cache hit — serve immediately. (Future PR: refresh in the
        // background via stale-while-revalidate.)
        return cached;
      }

      try {
        const response = await fetch(request);
        // Only cache successful CORS responses. 4xx / 5xx errors get
        // returned to the page but not stored. Opaque responses
        // (no-cors fetches) are deliberately skipped — they expose
        // status=0 so we can't tell success from upstream failure,
        // and OL's tile sources set `crossOrigin: 'anonymous'`
        // anyway, so genuine tile fetches always come back as CORS
        // responses with a real status.
        if (response.ok) {
          // `response.clone()` is required because a Response body
          // can only be consumed once and we need to both return it
          // and put it in the cache.
          cache.put(request, response.clone()).catch(() => {
            // Cache.put can throw on quota-exceeded or other storage
            // errors. Swallow so a full disk doesn't break the map.
          });
        }
        return response;
      } catch {
        // Network failure with no cached fallback — return a
        // synthetic 504 so OL fires its tileloaderror handler and
        // the tile-health banner can show the user. Empty body
        // because the response stands in for image bytes;
        // returning text would surface "corrupt image" warnings in
        // the browser console when OL tries to decode it.
        return new Response(null, {
          status: 504,
          statusText: 'Gateway Timeout',
        });
      }
    })()
  );
});
