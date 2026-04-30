# System overview

C4 Context (level 1) and Container (level 2) views of the
Northwest Discovery Water Trail map site. Diagrams are written
as Mermaid `flowchart`s (the C4 plugin is unstable on GitHub's
renderer) and render directly on GitHub.

## Context

The whole product fits in one diagram: a public, browser-based
map plus a small set of editorial articles. Source data is a
static GeoJSON file we maintain in this repository plus MDX
content under `content/`; the deployed site is a static export
served by Netlify's CDN.

```mermaid
flowchart LR
  boater(["Boater /<br/>trip planner"])
  maintainer(["Maintainer"])

  site["NW Discovery Water Trail map<br/>Static Next.js site<br/>159 launch sites + GPX downloads<br/>+ editorial pages (MDX + TSX)"]

  netlify[("Netlify CDN<br/>HTTPS, deploy previews")]
  github[("GitHub<br/>repo · CI · dependabot")]
  tiles[("Tile providers<br/>OSM · USGS Topo · OpenTopoMap<br/>OpenSeaMap · Waymarked Trails")]
  wwta[("Washington Water Trails Assoc.<br/>future data integration")]

  boater -->|Browses, opens site panel,<br/>downloads GPX| netlify
  netlify -->|Serves| site
  maintainer -->|PRs, reviews| github
  github -->|Auto-deploys on merge to main| netlify
  site -.->|Tile fetches in browser| tiles
  wwta -.->|Trail-data sync<br/>planned, ArcGIS / DB| site

  classDef person fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
  classDef sys fill:#f3e8ff,stroke:#9333ea,color:#581c87;
  classDef ext fill:#fef3c7,stroke:#d97706,color:#78350f;
  class boater,maintainer person
  class site sys
  class netlify,github,tiles,wwta ext
```

## Container

The container view zooms into the deployable units. Notice that
**the only dynamic component is the user's browser** — Netlify
serves pre-rendered HTML and the trail data + editorial articles
are baked into each page at build time.

```mermaid
flowchart TB
  boater(["Boater"])

  subgraph deploy["Static deploy on Netlify"]
    direction TB
    html["Pre-rendered HTML<br/>Next.js static export<br/>map · sites index · site detail<br/>+ water-safety · river-navigation<br/>+ leave-no-trace · natural-world<br/>+ past-and-present · trip-planning<br/>+ get-involved · about · about/*"]
    js["Hydration bundle<br/>React 19 + OpenLayers 10<br/>map · layer switcher<br/>panel · GPX download"]
    css["Atomic CSS<br/>PandaCSS<br/>generated at build time<br/>no runtime CSS-in-JS"]
    data[("/data/ndwt.geojson<br/>159 sites + facility flags<br/>still served for external GIS")]
    mdx[("content/*.mdx<br/>editorial articles<br/>safety · navigation · history…")]
  end

  ci(["GitHub Actions CI<br/>lint · typecheck · Vitest<br/>Playwright · SonarCloud · DeepSource"])
  tiles[("Tile servers<br/>OSM · USGS · OpenTopoMap<br/>OpenSeaMap · Waymarked Trails")]
  repo[("ivanoats/ndwt-ol-chakra<br/>source of truth")]

  boater -->|HTTPS| html
  html -->|Hydrates| js
  js -->|Tile requests| tiles
  html -.->|Baked at build time| data
  html -.->|Baked at build time| mdx
  repo -->|Push triggers| ci
  ci -->|Static export → out/| deploy

  classDef container fill:#f3e8ff,stroke:#9333ea,color:#581c87;
  classDef store fill:#fef3c7,stroke:#d97706,color:#78350f;
  classDef ext fill:#fee2e2,stroke:#dc2626,color:#7f1d1d;
  classDef person fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
  class boater person
  class html,js,css container
  class data,mdx store
  class ci,tiles,repo ext
```

## Why this shape

- **Static export** keeps hosting cheap and the deploy preview
  fast. No server runtime, no API routes, no cold starts.
- **Trail data baked in at build time** kills the runtime fetch
  hop and gives the map paint at first byte. The
  `/data/ndwt.geojson` file is still published unchanged so
  anyone running their own map / trip planner can ingest the
  dataset directly.
- **MDX content baked in too** — editorial articles ship as
  pre-rendered HTML; no MDX runtime in the client bundle.
- **Multiple tile providers, all client-fetched** — the map UI
  exposes a layer switcher so users can toggle between the
  OSM street basemap, USGS topo, and OpenTopoMap, and overlay
  OpenSeaMap sea marks or Waymarked Trails hiking. All tile
  fetches are direct from the browser to the provider; the
  static deploy never proxies them.
- **OL is the only meaningful client-side dependency** — the
  hydration bundle stays small because we don't ship a UI
  runtime (Park UI components compile to plain elements +
  atomic CSS).

## See also

- [`hexagonal.md`](./hexagonal.md) — how the source code is
  organized into ports and adapters
- [`data-flow.md`](./data-flow.md) — the build-time + runtime
  sequence that produces what's described above
- [`components.md`](./components.md) — module-level layout
