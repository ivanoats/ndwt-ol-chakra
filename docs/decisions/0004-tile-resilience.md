# ADR 0004: Tile resilience via tracker + service worker + cache storage

- **Status:** Accepted (issue [#64](https://github.com/ivanoats/ndwt-ol-chakra/issues/64), 2026-05)
- **Deciders:** Ivan Storck

## Context

NDWT runs through some of the most cell-dead reaches of the Pacific
Northwest: Hanford Reach, the Snake River canyons, the Wallula Gap.
The realistic usage pattern is _plan from home (WiFi), open the map
on the river (no signal)_. Before this work, four problems compounded
that pattern badly:

1. **Tile-host outages were invisible to users.** OpenLayers leaves a
   failed tile cell blank with no UI feedback. A USGS outage looked
   identical to "you panned past the cached area."
2. **No retry, no fallback.** A flaky basemap stayed flaky until the
   user manually picked a different one — and there was no signal
   suggesting they should.
3. **No offline behaviour.** First page load worked online or didn't
   load at all; tiles fetched live from each provider with no caching
   layer of our own.
4. **No way to prepare for a trip.** A paddler couldn't "save the
   route's tiles for offline use" on WiFi before going out.

Issue [#64](https://github.com/ivanoats/ndwt-ol-chakra/issues/64)
laid out a three-tier roadmap; this ADR captures the load-bearing
choices made across PRs #65 / #67 / #68 / #70 / #71.

## Decision

### 1. Classifier as a pure module, separate from the Zustand slice

`src/components/tile-health-tracker.ts` is a framework-free classifier
that takes a rolling window of `{kind: 'success'|'error', at: number}`
events and returns `'unknown' | 'ok' | 'degraded' | 'down'`. The
Zustand store `src/store/tile-health.ts` is a thin wrapper that holds
per-layer state and calls into the classifier on every tile event.

The tracker is unit-tested directly in jsdom with no React, no OL,
and no store. The store has its own small test suite focused on the
React integration. Splitting the two means a misclassification bug
is reproducible from a 30-line vitest test, not a render setup.

### 2. Sticky-down latching via `downSince`

When a layer crosses the 'down' threshold, the tracker stamps a
`downSince: number` timestamp. The classifier then keeps reporting
'down' for `DOWN_PERSIST_MS` (5 minutes) even if a few sporadic
successes arrive — suppressing banner flapping during a flaky outage.

The alternative (purely instantaneous classification) created a UX
where the banner flickered open and closed during a partial outage,
which is worse than just staying up until the connection is genuinely
healthy again.

### 3. Raw `public/sw.js` rather than Workbox / next-pwa

The service worker is hand-written in `public/sw.js`, registered via
`src/lib/register-service-worker.ts`, and called once from `MapApp`
on first mount. Production-only (`NODE_ENV === 'production'` check).

We deliberately did not adopt Workbox or `next-pwa`. The SW is small
(~130 LOC), has a single concern (cache-first for known tile hosts),
and changes rarely. A build-pipeline coupling (Workbox runs a
manifest generator at build, next-pwa injects itself into Next's
config) would buy nothing here and would conflict with the static-
export setup (see ADR
[0001](./0001-nextjs-app-router.md)).

Version invalidation is by hand: bump the `CACHE_NAME` version suffix
(`ndwt-tiles-v1` → `ndwt-tiles-v2`) and the SW's `activate` handler
purges any cache whose name doesn't match. We do `skipWaiting()` +
`clients.claim()` so the new SW takes over immediately — tile
content's shape doesn't differ between SW versions, so there's no
risk of incompatible cached data.

### 4. Cache-first scoped strictly by tile hostnames

The SW's `fetch` handler intercepts only `GET` requests to known tile
hosts (`tile.openstreetmap.org`, `basemap.nationalmap.gov`, the
OpenTopoMap subdomains, `tiles.openseamap.org`,
`tile.waymarkedtrails.org`). Everything else passes through to the
browser's default handling, untouched. App bundles, the GeoJSON,
Next's static assets — all unaffected.

Two practical consequences:

- A future tile host needs adding to the `TILE_HOSTS` array in both
  `public/sw.js` and the e2e test (`e2e/offline.spec.ts`); the scope
  test fails loudly if they drift.
- Only `response.ok` responses are cached. 4xx / 5xx come through to
  the page (so OL fires its `tileloaderror` and the tracker counts
  them) but aren't stored. Opaque responses (no-cors) are skipped
  entirely because their `status === 0` makes "success vs upstream
  failure" undetectable; OL's tile sources set
  `crossOrigin: 'anonymous'` so this is a theoretical edge case
  anyway.

### 5. Tile-URL enumeration: pure helper + thin OL wrapper

`src/lib/tile-cache.ts:enumerateTileUrls` is the pure loop that
expands a tile range into URL strings. It takes duck-typed
`VisibleTileSource<P>` and `TileEnumerationContext<P>` inputs (a
generic `P` carries the projection type opaquely). It's 100% unit
tested.

`tileUrlsForMap` is the OL-aware glue: it walks `map.getLayers()`,
narrows via `instanceof TileLayer` + `instanceof UrlTile`, then
delegates to `enumerateTileUrls`. The function is marked
`/* c8 ignore */` because an OL canvas can't render in jsdom; Playwright
covers it end-to-end via the "pre-warm current viewport" e2e.

### 6. `globalThis.__ndwtMap` reuse for the settings drawer

The settings drawer reads the OL map handle off `globalThis.__ndwtMap`
to enumerate viewport tiles for pre-warm. The handle was already
exposed for Playwright deterministic interactions; it predates this
work.

The alternative (drilling a `Map` reference through the dynamic-
imported `MapComponent` into a sibling drawer) would have added a
layer of prop plumbing and a `useState<Map | null>` race during
first render. Reusing the existing handle is the smaller surface
area, and the handle is documented in CLAUDE.md as "the same Map a
real user already has via the DOM."

## Consequences

**Wins:**

- The five tiers compose into a graceful ladder: silent happy path →
  banner suggests fallback → SW serves cached tiles → offline pill
  appears → user can pre-warm the next trip's tiles. Each tier was a
  small focused PR (~200–400 LOC), reviewable independently.
- The pure tracker + pure enumeration helper give us 100% coverage on
  the hard-to-reach branches (sticky-down latching, tile-range math)
  without booting jsdom or OL.
- No build-pipeline change. The SW ships under `public/` and Next
  copies it through static export unmodified; the SW registration is a
  one-line `useEffect` on first mount.
- Bug surface is small: the SW intercepts only known hosts (strict
  allowlist), only caches successful CORS responses, and version-
  bumps are explicit.

**Costs / hazards:**

- **No explicit cache eviction.** We rely on the browser's LRU under
  storage pressure. Fine for MVP — a single trip's worth of tiles
  is ~5–30 MB, well below any modern storage budget — but worth
  revisiting if the cache becomes a hot spot. A future PR could add
  a size cap with oldest-first eviction.
- **`globalThis.__ndwtMap` is a soft contract.** The settings drawer
  silently no-ops if the handle is absent. Documented in CLAUDE.md
  but not type-enforced. A future refactor that removed the handle
  would break the drawer with no compile-time signal.
- **The `TILE_HOSTS` list lives in three places** (the SW, the e2e
  test, and implicitly in `map.tsx`'s layer definitions). Drift is
  caught by the scope-correctness e2e but the duplication is real.
  A future extraction to a shared constant would tighten this up.
- **SW skipped in dev** (`NODE_ENV === 'production'` gate). Local
  offline testing requires `npm run build && npm run preview`. Worth
  it: Next's HMR layer doesn't compose cleanly with SW caching, and
  the SW's scope is tiles-only so dev hot reload is unaffected.

## Alternatives considered

### Workbox / next-pwa

- **Why considered:** Standard ecosystem answer; gives precaching,
  routing DSL, automatic versioning.
- **Why rejected:** Workbox precaching wants a build manifest of
  every asset to cache, which is the wrong shape — we don't want to
  cache the GeoJSON or the JS bundles, only the third-party tiles. Its
  routing DSL is more general than a 7-host allowlist needs. next-pwa
  would require modifying `next.config.mjs` and adding a build step.
  Hand-written SW + no toolchain change was a net win for ~130 LOC.

### Caching tiles via OpenLayers' own image-tile mechanism

- **Why considered:** OL supports custom tile loaders that could read
  from IndexedDB or Cache Storage directly.
- **Why rejected:** Couples cache mechanics to the map component's
  lifecycle. The SW model has the cache outside the React tree, so
  a route navigation or component remount doesn't drop progress. The
  SW also handles the "offline pill while panning" case for free — OL
  fires `tileloaderror`, our tracker classifies, the banner can suggest
  a fallback — without us needing to model "is the cache hot for this
  region."

### IndexedDB for the tile store

- **Why considered:** More structured than Cache Storage; explicit
  schema; transactional.
- **Why rejected:** Cache Storage's `Cache.put` / `Cache.match` are
  designed exactly for the Request → Response shape we need. We never
  introspect tile bytes; storing them as opaque `Response` objects in
  the cache is simpler than serializing into IndexedDB rows. The
  estimated bytes readout in the settings drawer uses
  `navigator.storage.estimate()`, which doesn't care which API holds
  the bytes.

### Banner per layer rather than one shared banner

- **Why considered:** Cleaner per-layer status — "OSM is down, USGS
  is fine, but you're looking at OSM."
- **Why rejected:** The banner is about the _active_ layer; an
  overlay being down (e.g. OpenSeaMap) is rarely user-actionable. The
  health dots in the layer switcher (Tier 2) already give a per-layer
  signal without crowding the map canvas. One banner, two reads (red
  dot inline + banner if the active layer is the red one) is the
  right split.

## Notes

- Tier 1 (banner): PR
  [#65](https://github.com/ivanoats/ndwt-ol-chakra/pull/65)
- Tier 2 (health dots + auto-suggest + sticky-down): PR
  [#67](https://github.com/ivanoats/ndwt-ol-chakra/pull/67)
- Tier 3a (service worker): PR
  [#68](https://github.com/ivanoats/ndwt-ol-chakra/pull/68)
- Tier 3b (offline indicator pill): PR
  [#70](https://github.com/ivanoats/ndwt-ol-chakra/pull/70)
- Tier 3c (settings drawer): PR
  [#71](https://github.com/ivanoats/ndwt-ol-chakra/pull/71)
- See
  [`docs/architecture/overview.md`](../architecture/overview.md) for
  the SW in the container view, and
  [`docs/architecture/data-flow.md`](../architecture/data-flow.md)
  for the resilience sequence diagram.
