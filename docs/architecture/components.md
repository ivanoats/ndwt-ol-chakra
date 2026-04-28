# Component diagram

A module-level view of the source tree. Useful when navigating the
codebase or onboarding.

## The diagram

```mermaid
graph TB
  subgraph App["app/ — Next.js App Router"]
    Layout["layout.tsx<br/>html/body shell"]
    Providers["providers.tsx<br/>'use client'<br/>next-themes"]
    HomePage["page.tsx<br/>server: Hero + MapApp"]
    AboutPage["about/page.tsx<br/>article"]
    TripPage["trip-planning/page.tsx<br/>article"]
    Globals["globals.css<br/>cascade layers + #map"]
  end

  subgraph Layout_["src/components/layout/"]
    Header["Header.tsx<br/>'use client'<br/>logo + nav + active state"]
    Hero["Hero.tsx<br/>367-mile tagline"]
    Footer["Footer.tsx<br/>WWTA + GitHub + Netlify badge"]
  end

  subgraph UI_["src/components/ui/"]
    Box["box.tsx"]
    Stack["stack.tsx<br/>HStack / VStack"]
    Text["text.tsx"]
    Heading["heading.tsx"]
    Badge["badge.tsx"]
    Link["link.tsx<br/>safe-by-default external rel"]
    Button["button.tsx<br/>solid / ghost / outline"]
    IconButton["icon-button.tsx"]
    Drawer["drawer.tsx<br/>Ark UI Dialog<br/>modal=false"]
  end

  subgraph Map_["src/components/"]
    MapApp["MapApp.tsx<br/>'use client'<br/>composition + dynamic map"]
    MapTSX["map.tsx<br/>OL Map instance"]
    Handlers["map-handlers.ts<br/>pure click + pointermove"]
    Theme["ThemeToggleButton.tsx"]
  end

  subgraph Panels_["src/components/panels/"]
    Panel["SiteInfoPanel.tsx<br/>drawer wrapper"]
    Facilities["FacilityBadges.tsx"]
  end

  subgraph App_["src/application/"]
    Port["ports/site-repository.ts<br/>SiteRepository interface"]
    ListUC["use-cases/list-sites.ts"]
    GetUC["use-cases/get-site.ts"]
  end

  subgraph Domain_["src/domain/"]
    Site["site.ts"]
    Coords["coordinates.ts"]
    Fac["facility.ts"]
    Idx["index.ts (barrel)"]
  end

  subgraph Adapters_["src/adapters/"]
    LoadSites["inbound/next/<br/>load-sites.ts<br/>'server-only'"]
    InMem["outbound/<br/>in-memory-site-repository.ts"]
    Geo["outbound/<br/>geojson-site-repository.ts"]
    Parser["outbound/<br/>parseSitesFromGeoJson<br/>(shared parser)"]
    Gpx["outbound/<br/>site-to-gpx.ts"]
  end

  Comp["composition-root.ts<br/>createComposition factory"]
  Store["store/selected-site.ts<br/>Zustand"]

  Layout --> Providers
  Layout --> Header
  Layout --> Footer
  Layout --> Globals
  HomePage --> Hero
  HomePage --> MapApp
  HomePage --> LoadSites

  AboutPage --> Link
  TripPage --> Link

  MapApp --> MapTSX
  MapApp --> Panel
  MapApp --> Theme
  MapApp --> Comp

  MapTSX --> Handlers
  Handlers --> Store

  Panel --> Drawer
  Panel --> Heading
  Panel --> Stack
  Panel --> Box
  Panel --> Link
  Panel --> Button
  Panel --> Facilities
  Panel --> Store
  Panel --> Gpx

  Facilities --> Stack
  Facilities --> Badge

  Theme --> IconButton

  Comp --> InMem
  Comp --> ListUC
  Comp --> GetUC
  ListUC --> Port
  GetUC --> Port
  InMem -.implements.-> Port
  Geo -.implements.-> Port

  LoadSites --> Parser
  Geo --> Parser
  Site --> Coords
  Site --> Fac
  Idx --> Site

  classDef route fill:#dbeafe,stroke:#2563eb;
  classDef ui fill:#f3e8ff,stroke:#9333ea;
  classDef domain fill:#dcfce7,stroke:#16a34a;
  classDef app fill:#fef3c7,stroke:#d97706;
  classDef adapter fill:#fef3c7,stroke:#d97706;
  classDef glue fill:#fee2e2,stroke:#dc2626;

  class Layout,Providers,HomePage,AboutPage,TripPage,Globals route
  class Header,Hero,Footer,Box,Stack,Text,Heading,Badge,Link,Button,IconButton,Drawer,Panel,Facilities,MapApp,MapTSX,Theme ui
  class Site,Coords,Fac,Idx domain
  class Port,ListUC,GetUC app
  class LoadSites,InMem,Geo,Parser,Gpx adapter
  class Comp,Store,Handlers glue
```

## What lives where

### `app/`

Next.js App Router entry points only. `layout.tsx` sets the
HTML shell and global chrome (Header / main / Footer / Providers);
`page.tsx` per route is a thin server component that fetches the
data it needs and renders a presentation component. The whole
folder ships as RSC server components except `providers.tsx`
(client) which hosts `next-themes`.

### `src/components/layout/`

Shared chrome: Header (sticky top, nav, active state), Hero
(home-page-only intro), Footer (attribution + Netlify badge).
Tested with React Testing Library.

### `src/components/ui/`

The replacement for Chakra: thin styled primitives over Ark UI's
headless primitives + Panda's `css()` helper. Each file is one
component with optional variants. Hand-rolled rather than copied
from Park UI's full library because we only need nine and the
Panda preset already carries the design tokens.

### `src/components/panels/`

The site info Drawer and its supporting badges. The Drawer is
non-modal — clicking outside doesn't dismiss; ESC and the close
button do.

### `src/components/map.tsx` + `map-handlers.ts` + `MapApp.tsx`

The OpenLayers integration:

- `MapApp.tsx` is the `'use client'` boundary. It builds the
  composition once per `sites` prop via `useMemo` and dynamic-
  imports the OL component with `ssr: false`.
- `map.tsx` owns the `ol.Map` instance and its lifecycle (mount
  on `useEffect`, set the global test handle, clean up).
- `map-handlers.ts` exports curried pure functions
  (`makeHandleClick`, `makeHandlePointerMove`) that don't import
  any UI deps — straightforward to unit test against a fake Map.

### `src/domain/`

Pure types only. Adding a non-pure dependency here is a code
review red flag.

### `src/application/`

Port (`SiteRepository`) and the two use-case factories. No data,
no state.

### `src/adapters/`

Two outbound adapters (`InMemorySiteRepository`,
`GeoJsonSiteRepository`) and one inbound (`load-sites.ts`,
`'server-only'`). The serializer `site-to-gpx.ts` is also here —
strictly speaking it's an outbound port for an export format, not
the repository port.

### `src/composition-root.ts`

The single `createComposition(sites)` factory. **Client UI**
imports from here, never directly from adapters. **Server UI**
(route handlers in `app/`) imports inbound adapters directly —
that's the canonical hex-arch shape, where the route handler is
the framework's adapter driving the application from outside.
`app/page.tsx` awaiting `loadSites()` is by design, not a rule
break.

The "shared parser" node in the diagram (`parseSitesFromGeoJson`)
is currently a named export from `geojson-site-repository.ts`
that `load-sites.ts` reuses. It's adapter-internal infrastructure
shared across two adapters; if the parser ever grows real logic
beyond mapping GeoJSON properties to `Site` fields, extracting
it to its own module would be a clean refactor.

### `src/store/`

A single Zustand slice for the selected site. The split between
"domain data" (in the composition) and "ephemeral UI state" (in
Zustand) is intentional.

## See also

- [`overview.md`](./overview.md) — system context & containers
- [`hexagonal.md`](./hexagonal.md) — port/adapter layout
- [`data-flow.md`](./data-flow.md) — runtime + build-time
  sequences against this component layout
