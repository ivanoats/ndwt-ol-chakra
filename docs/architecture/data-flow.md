# Data flow

There are two distinct flows worth understanding: the **build-time
load** that bakes the trail data into the static export, and the
**runtime click** that opens the info panel for a selected marker.

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
  participant MapApp as <MapApp sites>
  participant Out as out/index.html

  CI->>Next: npm run build
  Next->>Page: render HomePage()
  Page->>Loader: await loadSites()
  Loader->>FS: readFile('public/data/ndwt.geojson')
  FS-->>Loader: JSON text
  Loader->>Parser: parseSitesFromGeoJson(body)
  Parser-->>Loader: readonly Site[]
  Loader-->>Page: Site[]
  Page->>MapApp: <MapApp sites={sites} />
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

## Notable design decisions in this flow

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
