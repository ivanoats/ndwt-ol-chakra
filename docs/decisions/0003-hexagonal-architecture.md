# ADR 0003: Hexagonal architecture for site data

- **Status:** Accepted (Phase 2, 2026-04)
- **Deciders:** Ivan Storck

## Context

Phase 1 of the modernization plan inherited a single-file Vite SPA
where the OpenLayers map fetched `public/data/ndwt.geojson`
directly via `VectorSource`'s URL prop. The data path looked like:

```text
React component → OL VectorSource → fetch → GeoJSON → render
```

This was fine for Phase 1 ("just keep it working") but tightly
coupled the rendering logic to the runtime fetch. Three things
were already on the roadmap that would each require a different
data path:

1. **Phase 3** (info panel): clicking a marker needs to look up
   site details by id, not just hand the GeoJSON to the map.
2. **Phase 4** (Next.js): the new home page wants to load the
   GeoJSON server-side at build time and pass the data to the
   client as a prop, not fetch it at runtime.
3. **Future WWTA integration**: the source dataset will eventually
   come from WWTA's database / ArcGIS layers instead of the
   static GeoJSON.

Three different data paths into the same UI is a setup that wants
ports and adapters.

## Decision

Adopt a hexagonal (ports + adapters) layout for `src/`:

- **`src/domain/`** — pure types: `Site`, `SiteId` (branded),
  `Coordinates`, `Facility`, `FacilitySet`. No framework deps. No
  classes. Plain JSON serializable so values can cross the React
  Server Components boundary.
- **`src/application/ports/site-repository.ts`** — a single
  interface (`list()`, `findById()`).
- **`src/application/use-cases/`** — `makeListSites(repo)`,
  `makeGetSite(repo)` factory functions that return functions
  consuming the port.
- **`src/adapters/outbound/geojson-site-repository.ts`** — fetch
  the JSON URL and parse (the original Phase 2 implementation).
- **`src/adapters/outbound/in-memory-site-repository.ts`** — wrap
  a pre-loaded `Site[]` with O(1) `findById` (added in Phase 4
  when sites started arriving as a prop from the server).
- **`src/adapters/inbound/next/load-sites.ts`** — `'server-only'`
  fs read of the GeoJSON, used by `app/page.tsx` at build time.
- **`src/composition-root.ts`** — pure factory:
  `createComposition(sites): { listSites, getSite }`. UI imports
  from here, never directly from adapters.

The dependency rule is **strict**:

```text
domain        ← nothing
application   ← domain
adapters      ← application + domain
ui            ← application + domain  (via composition root)
```

## Consequences

**Wins:**

- The Phase 4 migration didn't touch any UI code. We added a
  new outbound adapter (`InMemorySiteRepository`) and a new
  inbound adapter (`load-sites.ts`); the panel's `getSite` call
  unchanged. End-to-end PR diff was localized to where the data
  shape change actually was.
- The Phase 2 click-handler refactor became unit-testable. The
  curried `makeHandleClick(map, getSite)` accepts a `GetSite`
  function — tests pass a `vi.fn()` and assert against the
  Zustand store. No mocked `fetch`, no jsdom OL setup.
- The future WWTA integration will be a third outbound adapter
  (something like `WwtaArcgisSiteRepository`). The composition
  root picks one. UI doesn't change.
- The domain stays serializable. When Phase 4 moved `Site[]`
  through the RSC boundary, `FacilitySet`'s class shape was
  the only blocker — replaced with `readonly Facility[]` and
  the migration was unblocked.

**Costs / hazards:**

- Structurally heavier than this app's data flow strictly
  needs. One file, one in-memory map, one fs read at build time
  — a less ceremonious design (e.g. `loadSites()` directly
  exporting a `Site[]` constant) would also work.
- Several layers of indirection for someone reading the code
  for the first time. The use-case factories
  (`makeListSites`, `makeGetSite`) are essentially one-liners
  — kept for symmetry with `findById` and to make the pattern
  scale uniformly.
- "UI never imports adapters" is enforced by code review, not
  a lint rule. Easy to drift if a future PR takes a shortcut.

## Alternatives considered

### Direct module-level `Site[]` export

- **Why considered:** The dataset is small and static. We could
  have just had `src/sites.ts` export the parsed array.
- **Why rejected:** Couples build-time pipeline to UI structure;
  no clean way to support "swap in a database adapter later."
  The plan called out the WWTA integration as an explicit future
  use case.

### React Context provider for the repo

- **Why considered:** Common React pattern for "wired
  dependencies."
- **Why rejected:** The first cut of the composition root used
  a module-level mutable `repository` and a `hydrateSites()`
  function called from `MapApp`. The bot review on Phase 4
  caught that mutating module-level state during render is a
  concurrent-React hazard. We pivoted to a pure
  `createComposition(sites)` factory called via `useMemo`.
  React Context would have worked too but the factory pattern
  was simpler — UI components consume `getSite` as a closure,
  no `useContext` plumbing.

### Skip the abstraction; let `map.tsx` `fetch()` the JSON

- **Why considered:** That's literally what Phase 1 did and it
  was fine.
- **Why rejected:** Once Phase 3 needed `findById` for the
  click-to-panel flow and Phase 4 needed build-time loading,
  putting that logic in `map.tsx` would have grown the
  component into a god class. The repository abstraction is
  the natural seam.

## Notes

- The architecture was introduced in PR
  [#23](https://github.com/ivanoats/ndwt-ol-chakra/pull/23).
- See [`docs/architecture/hexagonal.md`](../architecture/hexagonal.md)
  for the full ports/adapters diagram and the dependency rule
  enforcement points.
