# ADR 0001: Next.js 16 App Router with static export

- **Status:** Accepted (Phase 4, 2026-04)
- **Deciders:** Ivan Storck

## Context

The original site was an ASP.NET site at ndwt.org. Phases 1–3 of
the modernization plan rebuilt the front-end as a Vite SPA
(React 18 + Chakra UI 2 + OpenLayers) and shipped a static bundle
to Netlify. By the end of Phase 3 we had:

- A working interactive map with click-to-open info panel
- ~150 sites loaded from `public/data/ndwt.geojson` at runtime
  via `fetch`
- Hexagonal architecture with a `SiteRepository` port
- E2E coverage with Playwright

The plan called for a Next.js migration in Phase 4. The question
was *which* Next.js shape to ship: SPA-style with a client-side
data fetch, App Router with server components, full SSR with a
running Node server, or static export.

## Decision

Next.js 16 (App Router) with `output: 'export'`, generating a
static `out/` directory served by Netlify. No running Node
process at request time. Trail data is loaded server-side **at
build time only** (`'server-only'` `loadSites` reads
`public/data/ndwt.geojson` via `fs/promises`) and inlined into
each prerendered page tree.

React 19 throughout. Image optimization disabled
(`images: { unoptimized: true }`) so the static export ships
real `<img>` tags via `next/image` with no edge optimizer.

## Consequences

**Wins:**

- The Netlify deploy keeps the same shape it had in Phases 1–3:
  static files, free hosting, sub-second cold paint, no cold
  starts.
- Replacing the runtime GeoJSON fetch with a build-time fs read
  removes a network round-trip from first paint and gives Sonar
  / Lighthouse fewer things to complain about.
- Server components naturally express the "load this once at
  build time" use case without us inventing a static-data
  pipeline. `app/page.tsx`'s `await loadSites()` reads as the
  thing it is.
- App Router's nested-layout model lets `app/layout.tsx` own the
  Header/Footer chrome once for every route. Adding new routes
  (`/about`, `/trip-planning`) is a per-page file with no
  layout boilerplate.
- The codebase gets free static-export niceties: per-route
  `metadata`, file-based routing, automatic `<head>` building.

**Costs / hazards:**

- Static export disables a long list of Next features (API
  routes, ISR, dynamic params without `generateStaticParams`,
  middleware, image optimization). We don't currently need any
  of them, but choosing this constrains future moves.
- Anything that touches `window` at module import has to be
  dynamic-imported with `ssr: false`. OL is the canonical
  example; `MapApp.tsx` does this for `map.tsx`. Easy to forget
  and the build error message is awkward.
- Static export and the Sonar Action's automatic-analysis mode
  collide; you have to pick CI-Action *or* automatic. We chose
  the Action so we get coverage upload, and disabled automatic
  analysis in the SonarCloud project settings.
- The new-code coverage gate (Sonar's 80% threshold) doesn't
  count Playwright. Anything new that lives only in glue
  (`load-sites.ts`, `MapApp.tsx`, `app/`) needs at least a smoke
  test in Vitest, even when the Playwright suite covers the
  user-visible behavior.

## Alternatives considered

### Plain Vite SPA (the Phase 3 shape)

- **Why considered:** It worked. Phase 1–3 was already shipping.
- **Why rejected:** No native server-component model means
  build-time data fetching is a custom pipeline (Vite plugin or
  prebuild script). We'd have to write the equivalent of
  `'server-only' load-sites.ts` ourselves. The site is also
  small enough that introducing the App Router conventions now
  is cheaper than introducing them later when we have more
  routes / features.

### Next.js with full SSR / SSG hybrid (no `output: 'export'`)

- **Why considered:** Gives us API routes, ISR, image
  optimization "for free" if we ever need them.
- **Why rejected:** Requires a running Node server. The trail
  dataset doesn't change minute-to-minute and the site's traffic
  is small; paying for compute is wrong-shape. Netlify's
  Next.js plugin can do SSR-on-Lambda but the cold starts and
  variability are real costs for zero current benefit.

### Astro

- **Why considered:** Genuinely competitive for content sites
  with a small interactive island.
- **Why rejected:** OL, Park UI / Ark UI, and `next-themes` all
  have first-class Next adapters; switching frameworks for a
  marginal differentiator wasn't worth re-platforming the work
  that was already done.

## Notes

- See [`docs/architecture/data-flow.md`](../architecture/data-flow.md)
  for the build-time and runtime sequence diagrams.
- The migration was PR
  [#31](https://github.com/ivanoats/ndwt-ol-chakra/pull/31).
