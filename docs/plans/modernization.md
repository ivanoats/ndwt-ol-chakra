# Modernize Northwest Discovery Water Trail map site

## Status

| Phase | Description                                     | State         |
| ----- | ----------------------------------------------- | ------------- |
| 1     | Tooling baseline                                | Done (PR #22) |
| 2     | Hexagonal skeleton inside current Vite app      | Done (PR #23) |
| 2.5   | Playwright e2e harness                          | Done (PR #24) |
| 3     | Info panel on Chakra (pre-Next/Panda)           | Done (PR #30) |
| 4     | Migrate to Next.js 16 App Router (still Chakra) | Done (PR #31) |
| 5     | Swap Chakra for PandaCSS + Ark UI + Park UI     | In progress   |
| 6     | Layout & content polish                         | Pending       |
| 7     | Docs & memory files                             | Pending       |

## Context

The site is a small Vite + React 18 + Chakra UI 2 + OpenLayers SPA that
renders ~150 boating access sites along the Snake/Columbia/Clearwater
corridor from a static GeoJSON file. Today it shows the map and a
title — nothing else. There's no info panel, no real layout, no domain
model, no documentation beyond a one-paragraph README.

Goal of this change: bring the site to a modern, maintainable baseline
without changing what makes it valuable (the geographic data, the
Netlify deploy, the OpenLayers map). Specifically:

- Move from Vite SPA to **Next.js 16 (App Router)** with static export so
  it keeps deploying to Netlify with the same build artifact shape.
- Replace **Chakra UI 2** (Emotion runtime CSS-in-JS) with **PandaCSS**
  (build-time atomic CSS) + **Ark UI** (headless primitives) + **Park UI**
  (styled preset). No Tailwind.
- Reorganize the code as a **hexagonal architecture**: a pure `domain`
  module, an `application` layer of use cases against ports, and
  `adapters` for OpenLayers, GeoJSON loading, and Next.js UI.
- Add a real **data layer**: typed `Site` entity, repository port,
  GeoJSON adapter that reads `public/data/ndwt.geojson` at build time.
- Each site marker becomes clickable and opens an **info panel**
  (Park UI Drawer) showing river segment, mile, bank, facilities,
  season, contact, and website.
- New **README.md**, new **CLAUDE.md**, and a **`docs/architecture/`**
  folder of MermaidJS-embedded diagrams.
- **markdownlint-cli2** wired into lint-staged so all `.md` files stay
  consistent.
- **CI/CD on GitHub Actions** running lint, typecheck, test, build, and
  markdownlint on every PR; preview deploy via Netlify.
- **DeepSource** and **SonarCloud** wired in for static analysis,
  security scanning, and PR review comments.
- After every PR, a deliberate pass to **scan and respond to bot review
  comments** (Gemini Code Assist, GitHub Copilot, DeepSource,
  SonarCloud) — accept what's right, push back on what's noise, leave a
  trail of why.

This plan is intentionally one PR's worth of scope per phase so it can
be merged incrementally without leaving the tree broken.

## Tech-stack decisions

| Concern               | Choice                                                                                                                       | Why                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework             | Next.js 16, App Router, `output: 'export'`                                                                                   | Keeps the Netlify static deploy model; gives App Router conventions, server components for build-time data, and a clean Vite-replacement story.                                                                                             |
| Styling               | PandaCSS                                                                                                                     | Build-time atomic CSS, zero runtime, type-safe tokens. Same authors as Chakra. Explicitly NOT Tailwind.                                                                                                                                     |
| Headless primitives   | Ark UI (`@ark-ui/react`)                                                                                                     | Accessible, framework-agnostic primitives (Dialog, Popover, Tooltip). Powers the Drawer used by the info panel.                                                                                                                             |
| Styled preset         | Park UI                                                                                                                      | Pre-styled component recipes on top of Panda + Ark — gives us Chakra-level ergonomics without Emotion's runtime.                                                                                                                            |
| Map                   | Keep OpenLayers (`ol@10`)                                                                                                    | No reason to swap; it works and the GeoJSON pipeline is already in place.                                                                                                                                                                   |
| State / data fetching | React 19 server components for build-time GeoJSON load; lightweight client store (Zustand) only for "selected site" UI state | Data is static, ~145 KB GeoJSON. Doesn't justify TanStack Query.                                                                                                                                                                            |
| Tests (unit)          | Vitest + React Testing Library                                                                                               | Vitest plays better with the Panda toolchain than Jest; replaces Jest config.                                                                                                                                                               |
| Tests (e2e)           | Playwright (Chromium only)                                                                                                   | Catches the "all markers render" / "panel opens" regression class that the unit suite can't see. Runs against the production build via `vite preview`.                                                                                      |
| Markdown lint         | markdownlint-cli2 + lint-staged + husky                                                                                      | Same husky we already have.                                                                                                                                                                                                                 |
| Hosting               | Netlify, unchanged                                                                                                           | `next build` produces `out/`; `netlify.toml` points at it.                                                                                                                                                                                  |
| Node                  | 24 (current LTS)                                                                                                             | Pinned in `package.json` engines, GitHub Actions, and `netlify.toml`.                                                                                                                                                                       |
| Package manager       | npm                                                                                                                          | Existing `package-lock.json`; no reason to switch.                                                                                                                                                                                          |
| CI                    | GitHub Actions                                                                                                               | Free, native to the repo, runs lint/typecheck/test/build/markdownlint on PRs and pushes to `main`. Third-party actions pinned to commit SHAs.                                                                                               |
| Static analysis #1    | DeepSource                                                                                                                   | JS/TS analyzer + secrets scan + transformer auto-fixes; posts inline PR comments.                                                                                                                                                           |
| Static analysis #2    | SonarCloud                                                                                                                   | Wider rule set (bugs, code smells, security hotspots, duplication, coverage gates). Free for public repos. Complements DeepSource rather than duplicating — Sonar focuses on quality/coverage gates, DeepSource on actionable inline fixes. |
| Bot review triage     | Manual sweep + `gh pr view --comments`                                                                                       | After CI is green, read every bot's comments (Gemini Code Assist, Copilot, DeepSource, Sonar), classify as fix/defer/dismiss, and leave a one-line reason on each dismissed thread.                                                         |

## Target folder layout

```text
src/
  domain/                          # Pure, no framework deps
    site.ts                        # Site entity + factory
    river.ts                       # River, RiverSegment, Bank
    facility.ts                    # Facility enum + amenity flags
    coordinates.ts                 # Coordinates value object
    index.ts
  application/
    ports/
      site-repository.ts           # interface SiteRepository
      map-renderer.ts              # interface MapRenderer
    use-cases/
      list-sites.ts
      get-site.ts
      filter-sites.ts              # by river/segment/facility
  adapters/
    outbound/
      geojson-site-repository.ts   # implements SiteRepository
      openlayers-map-renderer.ts   # implements MapRenderer
    inbound/
      next/                        # adapter glue: server components
        load-sites.ts              # cached() loader → SiteRepository
  ui/
    components/
      map/
        SiteMap.tsx                # client component, mounts OL
        SiteMarker.ts              # OL style helpers
      layout/
        Header.tsx
        Footer.tsx
        ThemeToggle.tsx
      panels/
        SiteInfoPanel.tsx          # Park UI Drawer
        FacilityBadges.tsx
    store/
      selected-site.ts             # Zustand: { selectedSiteId, select(), close() }
  styled-system/                   # Generated by `panda codegen`
app/                               # Next.js App Router
  layout.tsx
  page.tsx                         # the map page
  about/page.tsx
  trip-planning/page.tsx
  globals.css                      # Panda preflight + reset
public/
  data/
    ndwt.geojson                   # unchanged
    sites.csv                      # unchanged (source of truth backup)
docs/
  plans/
    modernization.md               # this file
  architecture/
    overview.md                    # C4 context + container (mermaid)
    hexagonal.md                   # ports & adapters diagram (mermaid)
    data-flow.md                   # sequence: marker click → panel (mermaid)
    components.md                  # component diagram (mermaid)
  decisions/
    0001-nextjs-app-router.md      # ADR
    0002-pandacss-over-chakra.md
    0003-hexagonal-architecture.md
panda.config.ts
next.config.mjs
.markdownlint-cli2.jsonc
README.md                          # rewritten
CLAUDE.md                          # new
```

The dependency rule: `domain` → nothing. `application` → `domain`.
`adapters` → `application` + `domain`. `ui` → `application` + `domain`
(never reaches into `adapters` directly; gets repos via DI through a
small `composition-root.ts`).

## Domain model (sketch)

`Site` is the aggregate. Built from one GeoJSON `Feature`:

```ts
// src/domain/site.ts
export type SiteId = string & { readonly __brand: 'SiteId' };

export interface Site {
  readonly id: SiteId; // derived from web-scraper-order
  readonly riverSegment: string; // e.g. "Lake Umatilla"
  readonly riverName: string; // e.g. "Columbia"
  readonly riverMile: number;
  readonly bank: Bank; // OR | WA | ID | North | South | ...
  readonly coordinates: Coordinates;
  readonly season?: string;
  readonly camping?: string;
  readonly contact?: string;
  readonly phone?: string;
  readonly website?: string;
  readonly facilities: FacilitySet; // bitflags or Set<Facility>
  readonly sourceUrl?: string;
}
```

`FacilitySet` wraps the nine `*-src` boolean flags
(restrooms, potableWater, marineDumpStation, dayUseOnly,
picnicShelters, boatRamp, handCarried, marina, adaAccess) so UI can
ask `site.facilities.has(Facility.BoatRamp)` instead of stringly-typed
property lookups.

## Per-PR bot review triage

Every PR will collect comments from up to four bots: Gemini Code
Assist, GitHub Copilot review, DeepSource, SonarCloud. Treat these as
a free junior reviewer — useful but noisy. The drill, run after CI is
green and before requesting human review:

1. `gh pr view <num> --comments` and
   `gh api repos/:owner/:repo/pulls/<num>/comments` to dump every
   inline thread in one place.
2. Bucket each comment:
   - **Fix** — real bug, clear improvement, or accessibility miss.
     Push a fixup commit; reply to the thread with the commit SHA.
   - **Defer** — valid but out of scope for this PR. File a follow-up
     issue, link it in the reply, mark thread resolved.
   - **Dismiss** — wrong, stylistic-only, or already-correct code the
     bot misread. Reply with a one-line reason and resolve.
3. Re-run CI; verify DeepSource/Sonar status checks flip to passing
   or have explicit "won't fix" annotations.
4. Tick the "bot triage complete" box in the PR template, then ask
   for human review.

Gemini and Copilot tend to surface naming/clarity nits; DeepSource
catches real anti-patterns and security smells; Sonar adds duplication
and coverage-gap signal. Don't auto-accept any of them — each fix is a
real diff that has to make sense in the context of this codebase.

## Build sequence (one PR per phase)

### Phase 1 — Tooling baseline (no behavior change)

- Add markdownlint config + npm script + lint-staged hook.
- Replace Jest with Vitest (mirror existing test file).
- Bump TS to strictest reasonable settings (`noUncheckedIndexedAccess`).
- Add `docs/` folder with empty placeholders so later PRs only edit.
- **GitHub Actions**: add `.github/workflows/ci.yml` running on
  `pull_request` and `push: main`. Job: `npm ci` → `lint` → `lint:md`
  → `typecheck` → `test --coverage` → `build`. Cache npm. Upload
  coverage artifact for Sonar. Pin third-party actions to commit SHAs.
- **DeepSource**: add `.deepsource.toml` enabling the JavaScript/TS
  and `secrets` analyzers and the Prettier transformer. Enable the
  repo at deepsource.io and authorize the GitHub App.
- **SonarCloud**: add `sonar-project.properties` with sources/tests
  and `sonar.javascript.lcov.reportPaths=coverage/lcov.info`. Add a
  `.github/workflows/sonar.yml` invoking
  `SonarSource/sonarcloud-github-action` (pinned to SHA) with
  `SONAR_TOKEN` from repo secrets. Create the org/project at
  sonarcloud.io and add the secret.
- **netlify.toml**: pin `NODE_VERSION = "24"`, set `command` and
  `publish = "dist"` so the deploy preview matches local Node.
- **Pull request template** at `.github/pull_request_template.md`
  reminding the author to (a) link the phase in this plan, (b) check
  the "bot triage" box once Gemini/Copilot/DeepSource/Sonar comments
  have been addressed.
- Verify: `npm run lint`, `npm run lint:md`, `npm run typecheck`,
  `npm test`, `npm run build`, dev server still runs. Open a
  throwaway PR to confirm CI is green and DeepSource/Sonar/Gemini/
  Copilot all post comments.

### Phase 2 — Hexagonal skeleton inside current Vite app

- Create `src/domain/`, `src/application/`, `src/adapters/outbound/`.
- Write `Site` entity, `SiteRepository` port, `GeoJsonSiteRepository`.
- Refactor `components/map.tsx` to consume `SiteRepository.list()`
  instead of OpenLayers reading the URL directly.
- Wire repo through a tiny `composition-root.ts`.
- Verify: map still renders, all 150 sites visible, no visual
  regression.

### Phase 3 — Info panel on Chakra (still pre-Next/Panda)

- Add a `getSite(id)` use case + composition-root export.
- Add a Zustand `selected-site` store holding the full `Site | null`
  so the panel is a pure render and the click handler does the
  (cached) lookup.
- Style the OL vector layer so markers are visible (filled circle +
  stroke), and add a click handler with hit tolerance that resolves
  the clicked feature → `Site` → store dispatch.
- Build `SiteInfoPanel` against the current Chakra Drawer (river
  segment + mile, bank, FacilityBadges, season, camping, contact +
  phone, website link). Defer the Park UI swap to Phase 5.
- Test coverage:
  - Vitest: store reducer (select / close), `FacilityBadges` render.
  - Playwright: programmatic click on a known marker via a
    test-only `window.__ndwtMap` debug hook → drawer opens with the
    expected text.
- Verify in browser: click each marker, panel opens with correct
  data, ESC and backdrop close it, mobile layout works.

### Phase 4 — Migrate to Next.js 16 App Router (still Chakra)

- `next.config.mjs` with `output: 'export'`, `images.unoptimized: true`.
- Move `src/App.tsx` content into `app/page.tsx`; create `app/layout.tsx`.
- Replace `index.html` / `main.tsx` with App Router equivalents.
- Move static assets to `public/`.
- Server-component loader (`adapters/inbound/next/load-sites.ts`) reads
  GeoJSON from disk via `fs/promises` at build time, returns
  `Site[]` to the client component.
- Update `netlify.toml` to publish `out/` instead of `dist/`.
- Verify: `next build` produces `out/` with no TypeScript errors;
  `npx serve out` works locally; Netlify deploy preview green.

### Phase 5 — Swap Chakra for PandaCSS + Ark UI + Park UI

- `npm i -D @pandacss/dev` and `npm i @ark-ui/react @park-ui/...`.
- `panda init --jsx-framework react`; commit `panda.config.ts` with
  Park UI preset + the existing color tokens migrated from
  `src/theme.ts`.
- Replace each Chakra component:
  - `Box`/`Flex`/`Text` → Panda `styled` factories or `<div className={css(...)}>`.
  - Chakra `Drawer` → Park UI `Drawer` (Ark UI Dialog under the hood).
  - Chakra `IconButton` + `useColorMode` → Park UI `IconButton` + a
    small `next-themes`-based theme provider.
- Remove `@chakra-ui/*`, `@emotion/*`, `framer-motion` deps.
- Verify: visual parity check, dark mode still works, panel still
  opens, Lighthouse score hasn't regressed.

### Phase 6 — Layout & content polish

- New `Header` (logo + nav: Home, About, Trip Planning).
- Hero strip above the map with the 367-mile / Canoe Camp →
  Bonneville Dam tagline from the existing README intro.
- Full-bleed map fills viewport below the hero.
- `Footer` with attribution, Netlify badge, license, source link.
- Add `app/about/page.tsx` and `app/trip-planning/page.tsx` as stubs
  with the README copy.

### Phase 7 — Docs & memory files

- Write `README.md` (rewritten) with: project blurb, screenshot,
  quickstart, scripts, folder layout, contributing, license.
- Write `CLAUDE.md` with: stack summary, hex-arch dependency rule,
  Park UI / Panda conventions, data-layer conventions, test commands,
  "do NOT add Tailwind" guardrail, file-naming conventions.
- Author the four `docs/architecture/*.md` files with embedded
  MermaidJS:
  - **overview.md** — C4 context + container diagrams.
  - **hexagonal.md** — ports/adapters diagram showing
    `Domain ← Application ← Adapters ← (UI | GeoJSON | OpenLayers)`.
  - **data-flow.md** — sequence diagram: build-time GeoJSON load →
    server component → client `SiteMap` → OL click → store →
    `SiteInfoPanel`.
  - **components.md** — component-level diagram of `app/`, `ui/`,
    `application/`, `adapters/`.
- Author the three ADRs.
- Run `markdownlint-cli2 --fix` over everything.

## Files to create / modify (high-signal list)

Created:

- `next.config.mjs`, `panda.config.ts`, `postcss.config.cjs`
- `app/layout.tsx`, `app/page.tsx`, `app/about/page.tsx`,
  `app/trip-planning/page.tsx`, `app/globals.css`
- `src/domain/{site,river,facility,coordinates,index}.ts`
- `src/application/ports/{site-repository,map-renderer}.ts`
- `src/application/use-cases/{list-sites,get-site,filter-sites}.ts`
- `src/adapters/outbound/{geojson-site-repository,openlayers-map-renderer}.ts`
- `src/adapters/inbound/next/load-sites.ts`
- `src/ui/components/map/{SiteMap,SiteMarker}.tsx`
- `src/ui/components/layout/{Header,Footer,ThemeToggle}.tsx`
- `src/ui/components/panels/{SiteInfoPanel,FacilityBadges}.tsx`
- `src/ui/store/selected-site.ts`
- `src/composition-root.ts`
- `docs/architecture/{overview,hexagonal,data-flow,components}.md`
- `docs/decisions/{0001,0002,0003}-*.md`
- `CLAUDE.md`, `.markdownlint-cli2.jsonc`, `vitest.config.ts`,
  `netlify.toml`
- `.github/workflows/ci.yml`, `.github/workflows/sonar.yml`
- `.github/pull_request_template.md`
- `.deepsource.toml`, `sonar-project.properties`

Replaced wholesale:

- `package.json` (deps + scripts)
- `tsconfig.json` (Next.js preset, paths)
- `README.md`
- `.eslintrc.json` → `eslint.config.mjs` (flat config, Next preset)

Deleted at the end of Phase 5:

- `index.html`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`,
  `src/style.css`, `src/theme.ts`, `src/components/map.tsx`,
  `src/components/ThemeToggleButton.tsx`, `src/utils/general.ts`,
  `jest.config.js`

Kept as-is:

- `public/data/ndwt.geojson`, `public/data/sites.csv`,
  `src/favicon.svg`, `src/logo.svg` (moved to `public/`),
  `LICENSE`, `.husky/`.

## Verification

After Phase 5 (the last big swap) and again after Phase 7:

1. `npm install`
2. `npm run dev` — app loads at `localhost:3000`, map renders all
   sites, clicking any marker opens the drawer with the right data.
3. `npm run build` — produces `out/` with no TypeScript errors.
4. `npx serve out` — static export works in isolation.
5. `npm test` — Vitest passes; at minimum cover
   `GeoJsonSiteRepository.list()`, `Site` factory edge cases (missing
   facility flags, empty `season`), and `filter-sites` use case.
6. `npm run lint && npm run lint:md` — both green.
7. `git push` — Netlify deploy preview builds and serves the same
   `out/` shape.
8. GitHub Actions CI workflow shows green on the PR; DeepSource and
   SonarCloud both report "no new issues" (or have explicit dismissals
   on each finding); Gemini Code Assist and Copilot review threads
   are all either resolved with a fix or replied-to with a reason.

Done when: every marker is clickable, the info panel reveals correct
data, no Chakra/Emotion/Tailwind in the dep tree, `docs/architecture/`
renders MermaidJS diagrams on GitHub, and `README.md` + `CLAUDE.md`
both pass markdownlint.
