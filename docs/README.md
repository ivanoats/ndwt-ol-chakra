# Documentation

Architecture, decisions, and plans for the Northwest Discovery
Water Trail map site.

## Architecture

Diagrams use [MermaidJS](https://mermaid.js.org) and render
inline on GitHub.

- [`architecture/overview.md`](./architecture/overview.md) — C4
  context + container view (who uses the system, what runs where).
- [`architecture/hexagonal.md`](./architecture/hexagonal.md) —
  ports and adapters layout, the dependency rule, and where each
  layer lives in the source tree.
- [`architecture/data-flow.md`](./architecture/data-flow.md) —
  build-time GeoJSON load and runtime click-to-panel sequence.
- [`architecture/components.md`](./architecture/components.md) —
  module-level component diagram of `app/`, `src/components/`,
  `src/application/`, `src/adapters/`.

## Decisions

Architecture Decision Records explain the load-bearing choices:

- [`decisions/0001-nextjs-app-router.md`](./decisions/0001-nextjs-app-router.md) —
  Next.js 16 App Router with static export.
- [`decisions/0002-pandacss-over-chakra.md`](./decisions/0002-pandacss-over-chakra.md) —
  PandaCSS + Park UI preset over Chakra UI 2.
- [`decisions/0003-hexagonal-architecture.md`](./decisions/0003-hexagonal-architecture.md) —
  Hexagonal architecture for site data.

## Plans

- [`plans/modernization.md`](./plans/modernization.md) — the
  7-phase Vite → Next.js + PandaCSS rewrite that produced the
  current shape.
- [`plans/feature-parity.md`](./plans/feature-parity.md) — the
  follow-on phases (8+) bringing editorial content, sites
  detail pages, and the multi-section MDX subtree to parity
  with the legacy ndwt.org site.
- [`plans/photo-candidates.md`](./plans/photo-candidates.md) —
  the photo-discovery scraper (Wikimedia Commons + WWTA blog +
  planned Flickr / Mapillary) and the curation workflow that
  feeds per-site detail pages.

## Other

- [`gap-analysis.md`](./gap-analysis.md) — capability and copy
  comparison vs. the original ndwt.org site.
- [`gap-analysis-wwta.md`](./gap-analysis-wwta.md) — capability
  comparison vs. wwta.org, including the boundary line for
  what this site owns vs. what stays on the WWTA WordPress
  install (membership, donate, shop, events).
