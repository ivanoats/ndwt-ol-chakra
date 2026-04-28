# Hexagonal architecture

The source is organized as a hexagonal (ports + adapters) system.
The _domain_ is pure types with no framework dependencies; an
_application_ layer exposes use cases against a port interface;
_adapters_ implement the port for the build-time fs read and the
runtime in-memory lookup; the _UI_ talks to the application via a
thin composition root.

## The diagram

```mermaid
graph TB
  subgraph UI["UI ('use client' boundary)"]
    MapApp[MapApp.tsx<br/>composes the page]
    Map[map.tsx<br/>OL Map + click handler]
    Panel[SiteInfoPanel.tsx<br/>Drawer + GPX button]
    Store[(Zustand<br/>selected-site store)]
  end

  subgraph Server["Server boundary (Next App Router)"]
    Layout[app/layout.tsx]
    Page[app/page.tsx<br/>server component]
    Loader[load-sites.ts<br/>'server-only']
  end

  subgraph App["Application"]
    ListPort[/SiteRepository<br/>port<br/>list / findById/]
    ListUC[makeListSites]
    GetUC[makeGetSite]
  end

  subgraph Domain["Domain (pure)"]
    Site[Site<br/>SiteId branded]
    Coords[Coordinates]
    Facility[Facility<br/>FacilitySet = readonly Facility[]]
  end

  subgraph Adapters["Adapters"]
    Comp[composition-root.ts<br/>createComposition]
    InMem[InMemorySiteRepository]
    GeoJSON[GeoJsonSiteRepository<br/>fetch path; not used in prod]
    Parser[parseSitesFromGeoJson]
    Gpx[site-to-gpx]
  end

  Page -->|loadSites| Loader
  Loader -->|reads| FS[(public/data/<br/>ndwt.geojson)]
  Loader -->|parser| Parser
  Page -->|sites prop| MapApp

  MapApp -->|sites prop| Comp
  Comp --> InMem
  InMem -.implements.-> ListPort
  GeoJSON -.implements.-> ListPort
  ListUC -->|consumes| ListPort
  GetUC -->|consumes| ListPort

  MapApp -->|getSite| Map
  Map -->|selectedSite| Store
  Panel -->|reads| Store
  Panel -->|on click| Gpx

  ListPort -.uses.-> Site
  Site --> Coords
  Site --> Facility
  Parser --> Site
  Gpx --> Site

  classDef domain fill:#dcfce7,stroke:#16a34a,color:#0c4a3a;
  classDef app fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
  classDef adapter fill:#fef3c7,stroke:#d97706,color:#78350f;
  classDef ui fill:#f3e8ff,stroke:#9333ea,color:#581c87;
  classDef ext fill:#fee2e2,stroke:#dc2626,color:#7f1d1d;

  class Site,Coords,Facility domain
  class ListPort,ListUC,GetUC app
  class Comp,InMem,GeoJSON,Parser,Gpx adapter
  class MapApp,Map,Panel,Store,Layout,Page,Loader ui
  class FS ext
```

## Dependency rule

```text
  domain   ←   nothing
  application  ←   domain
  adapters  ←   application + domain
  ui   ←   application + domain  (via composition root)
```

Concrete enforcement points:

- **`src/domain/`** has zero imports outside its own folder. Adding
  one (e.g. `import 'react'`) is a code review red flag.
- **`src/application/ports/`** declares interfaces only. The use
  cases under `src/application/use-cases/` consume the port and
  return domain values; no React, no fs, no fetch.
- **`src/adapters/`** is the only place allowed to import platform
  APIs (`node:fs/promises`, `fetch`, the UI runtime). The
  `inbound/next/load-sites.ts` adapter uses `'server-only'` to
  guarantee it never gets bundled into the client.
- **`src/components/`** imports `@/composition-root` for runtime
  wiring and `@/domain` for types. Direct imports from
  `@/adapters/*` from a UI module are a smell — the composition
  root is the choke point.

## Why hexagonal here

The data path is small (one file, one in-memory map, one fs read
at build time). Hex-arch is structurally heavier than this app
strictly needs. We picked it anyway because:

1. **The repository pattern lets the same UI run with two
   different data adapters.** Phase 2 used `GeoJsonSiteRepository`
   (fetch URL); Phase 4 swapped to `InMemorySiteRepository`
   (pre-loaded by Next). The map and panel didn't change.
2. **Future WWTA integration will be a third adapter** — an
   ArcGIS REST adapter or a database loader — and the gap from
   "swap an adapter" to "rewrite the page" is the difference
   between a one-PR change and a one-month change.
3. **The domain stays serializable across the React Server
   Components boundary** because it has no framework deps.
   `FacilitySet` is `readonly Facility[]`, not a class, for
   exactly this reason.

See [ADR 0003](../decisions/0003-hexagonal-architecture.md) for
the full rationale.
