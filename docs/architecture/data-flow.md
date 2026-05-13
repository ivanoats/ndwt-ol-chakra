# Data flow

There are three flows worth understanding: the **build-time load**
that bakes the trail data into the static export, the **runtime
click** that opens the info panel for a selected marker, and the
**tile fetch with resilience** that the user actually exercises every
time they pan the map.

## Build-time: GeoJSON → static HTML

```mermaid
sequenceDiagram
  autonumber
  participant CI as GitHub Actions
  participant Next as next build
  participant Page as app/page.tsx<br/>(server)
  participant Loader as load-sites.ts<br/>(server-only)
  participant FS as public/data/<br/>ndwt.geojson
  participant Parser as parseSitesFromGeoJson
  participant MapApp as MapApp (sites prop)
  participant Out as out/index.html

  CI->>Next: npm run build
  Next->>Page: render HomePage()
  Page->>Loader: await loadSites()
  Loader->>FS: readFile('public/data/ndwt.geojson')
  FS-->>Loader: JSON text
  Loader->>Parser: parseSitesFromGeoJson(body)
  Parser-->>Loader: readonly Site[]
  Loader-->>Page: Site[]
  Page->>MapApp: render MapApp with sites prop
  Note over Page,MapApp: sites embedded as JSON<br/>in the React tree
  MapApp-->>Next: rendered HTML + RSC payload
  Next->>Out: writes static index.html<br/>with sites inline
```

**What this means in practice:**

- `npm run build` deterministically embeds the current GeoJSON
  into `out/index.html`. There is no runtime fetch of the dataset.
- A change to `public/data/ndwt.geojson` requires a rebuild
  (`npm run build` or a fresh deploy). Not a runtime concern.
- The same parser (`parseSitesFromGeoJson`) is used by the
  inbound/server loader and the outbound/client `GeoJsonSiteRepository`.
  Both produce identical `Site[]` shapes.

## Runtime: marker click → info panel

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant Browser as Browser<br/>(hydrated bundle)
  participant MapApp as MapApp.tsx
  participant Comp as createComposition
  participant Map as map.tsx<br/>(client only)
  participant Handler as makeHandleClick
  participant Repo as InMemorySiteRepository
  participant Store as Zustand<br/>selected-site
  participant Panel as SiteInfoPanel

  Note over Browser: HTML loads, React<br/>hydrates with sites prop

  Browser->>MapApp: render with sites
  MapApp->>Comp: createComposition(sites)
  Comp-->>MapApp: { listSites, getSite }
  MapApp->>Map: dynamic import (ssr: false)
  Map->>Browser: new ol.Map() + vector layer
  Note over Map: window.__ndwtMap exposed<br/>for Playwright
  Map->>Handler: makeHandleClick(map, getSite)

  User->>Browser: clicks marker
  Browser->>Handler: ol.click event
  Handler->>Map: forEachFeatureAtPixel
  Map-->>Handler: feature.getId() = SiteId
  Handler->>Repo: getSite(siteId)
  Repo-->>Handler: Site | null
  Handler->>Store: useSelectedSite.select(site)
  Store-->>Panel: re-renders with selected site
  Panel->>User: drawer opens with site info
```

## Runtime: tile fetch with resilience

Every pan, zoom, or basemap switch fires this loop. The service
worker intercepts the network round-trip and the tile-health store
tracks success/failure so the banner can suggest a healthy fallback
when an upstream provider goes flaky.

```mermaid
sequenceDiagram
  autonumber
  participant Map as map.tsx<br/>(OL TileLayer source)
  participant SW as public/sw.js<br/>(scoped to TILE_HOSTS)
  participant Cache as Cache Storage<br/>(ndwt-tiles-v1)
  participant Provider as Tile provider<br/>(OSM / USGS / …)
  participant Store as Zustand<br/>tile-health
  participant Tracker as tile-health-tracker
  participant Banner as TileHealthBanner
  participant Switcher as LayerSwitcher<br/>(per-layer dots)
  participant Pill as OfflineIndicator

  Note over Map: User pans → OL requests<br/>tile URL via img element

  Map->>SW: GET tile URL
  alt cache hit (warm region or pre-warmed)
    SW->>Cache: match(request)
    Cache-->>SW: cached Response
    SW-->>Map: 200 OK (from cache)
    Map->>Store: tileloadend(layerKey)
  else cache miss
    SW->>Provider: fetch(request)
    alt network ok and response.ok
      Provider-->>SW: 200 OK tile bytes
      SW->>Cache: put(request, response.clone())
      SW-->>Map: 200 OK
      Map->>Store: tileloadend(layerKey)
    else upstream error (4xx/5xx) or network failure
      SW-->>Map: error response<br/>(or synthetic 504 on netfail)
      Map->>Store: tileloaderror(layerKey)
    end
  end

  Store->>Tracker: classify(events)
  Tracker-->>Store: 'ok' / 'degraded' / 'down'

  alt active basemap is 'down'
    Store-->>Banner: re-render
    Banner-->>Map: shows banner +<br/>auto-suggest fallback
  end
  Store-->>Switcher: re-render dots
  Note over Pill: independent path —<br/>listens to navigator.onLine,<br/>shows pill when offline
```

**What this means in practice:**

- **The SW lives outside React.** A route navigation or component
  remount doesn't drop the cache; the SW keeps working while the page
  reloads.
- **The classifier is pure.** Sticky-down latching (`downSince`,
  5-minute persistence) suppresses banner flapping when an outage is
  partial — a few sporadic successes won't immediately revert the
  classification to 'ok'.
- **The SW only intercepts the seven known tile hosts.** App bundles,
  GeoJSON, MDX content, and static assets all pass through to the
  browser's default handling. See ADR
  [0004](../decisions/0004-tile-resilience.md) for the full host
  list and the rationale.
- **The "Save current view for offline use" action in the settings
  drawer** (top-right gear icon) walks the visible tile layers,
  enumerates every (z, x, y) in the current viewport, and fetches
  each through the same SW. After the action completes the tile
  count in the drawer reflects the warmed cache.

## Notable design decisions in these flows

- **`MapApp` builds a fresh composition per render** via `useMemo`
  on `sites`. There is **no module-level mutable state** — every
  click goes through the same per-render `getSite` closure.
  Removing the previous `hydrateSites(sites)` global was a
  concurrent-React safety fix (Phase 4 PR review).
- **`map.tsx` is dynamic-imported with `ssr: false`** because OL
  reads `window` at module init. Loading it on the server would
  crash the build.
- **Click handler is a pure curried function** in
  `src/components/map-handlers.ts`, unit-tested with a fake Map.
  The wrapper component `map.tsx` only owns the OL instance and
  the cleanup; logic stays testable.
- **Selected-site state is in Zustand**, not React state, because
  the click happens inside an OL event handler that doesn't have
  React context. Zustand's `getState()` works from anywhere.
- **The drawer is non-modal** (`Dialog.Root modal={false}`) so the
  map stays clickable while the panel is open. Different markers
  update the panel content in place.

## See also

- [`hexagonal.md`](./hexagonal.md) — the layer separation that
  makes this two-stage flow possible
- [`components.md`](./components.md) — which file each step lives
  in
- ADR [0001](../decisions/0001-nextjs-app-router.md) (static
  export) and [0003](../decisions/0003-hexagonal-architecture.md)
  (hex-arch) underpin the choice to bake data at build time
- ADR [0004](../decisions/0004-tile-resilience.md) explains the
  tile resilience choices — pure classifier, raw SW, cache-first
  scoped to known hosts, sticky-down latching
