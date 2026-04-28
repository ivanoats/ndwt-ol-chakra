# Operating instructions for Claude in this repo

This is the Northwest Discovery Water Trail map: a static export of
a Next.js 16 + React 19 + OpenLayers + PandaCSS site. The whole
site is built from a single GeoJSON dataset under `public/data/`
and deployed to Netlify.

For the full multi-phase rebuild story see
[`docs/plans/modernization.md`](./docs/plans/modernization.md).

## Stack at a glance

- **Next.js 16** App Router, `output: 'export'` → `./out`
- **React 19** + **TypeScript strict** (`noUncheckedIndexedAccess`)
- **PandaCSS** + **`@park-ui/panda-preset`** + **Ark UI**
- **OpenLayers 10** (`ol`) for the map
- **Zustand** for one tiny piece of UI state (selected site)
- **Vitest** unit tests; **Playwright** Chromium-only e2e
- **Node 24** pinned in `package.json` engines, `netlify.toml`,
  and the GitHub Actions workflow

## Architecture

Hexagonal (ports and adapters):

- **`src/domain/`** — pure types (Site, Coordinates, Facility,
  FacilitySet). No framework deps. No classes that need to cross
  the RSC boundary.
- **`src/application/`** — `SiteRepository` port + `listSites` /
  `getSite` use-case factories.
- **`src/adapters/inbound/next/load-sites.ts`** — server-only,
  reads `public/data/ndwt.geojson` via `fs/promises` at build
  time and returns `Site[]`.
- **`src/adapters/outbound/`** — `GeoJsonSiteRepository`,
  `InMemorySiteRepository`, `site-to-gpx` serializer.
- **`src/composition-root.ts`** — `createComposition(sites)`
  factory; pure, no globals.
- **`src/components/`** — UI: layout shell, `ui/` primitives,
  panels, map glue.

**Dependency rule** — domain depends on nothing; application on
domain; adapters on application + domain; UI on application +
domain _via the composition root_. UI never imports adapters
directly.

## Hard rules (corrections that have already happened)

- **Do NOT add Tailwind**, `@emotion/*`, `@chakra-ui/*`, or
  `framer-motion`. PandaCSS + Park UI preset replaced all of them
  in Phase 5; no runtime CSS-in-JS in this project.
- **`FacilitySet` is a `readonly Facility[]`, not a class.** Next
  cannot serialize class instances across the server→client
  boundary, so the domain model is plain JSON. Helpers are exposed
  as a const-as-namespace (`FacilitySet.empty()`,
  `FacilitySet.fromFlags(...)`).
- **No `<img>` tags** — use `next/image`. External hosts need a
  `remotePatterns` entry in `next.config.mjs` (the Netlify deploy
  badge is the only current case).
- **No `<html>` hydration mismatches**: `app/layout.tsx` keeps
  `suppressHydrationWarning` on `<html>` because next-themes
  intentionally divergees the class on `<html>` between server and
  client. The opt-out is one element deep; children still get
  full validation.
- **OL touches `window` at import time** — keep the map
  client-only. `MapApp.tsx` dynamic-imports `map.tsx` with
  `ssr: false`. Don't import `map.tsx` from a server component.
- **`window.__ndwtMap` is intentional** — exposes the OL Map
  instance to Playwright for deterministic interactions. Don't
  remove it.
- **`min-height: 0` on `<main>` is a footgun** — it lets main
  shrink below content size and clips long pages. Phase 6's fix
  was to drop it; don't reintroduce.

## Conventions

- **PandaCSS recipes**: prefer the `css({...})` helper at call
  site for one-offs. For variants/sizes (Button, IconButton)
  inline tables of `SystemStyleObject` — see
  `src/components/ui/button.tsx` for the pattern.
- **Color tokens**: `colorPalette.11` / `colorPalette.3` etc. with
  `colorPalette: 'green' | 'sage'` set on the same object. Never
  hardcode `gray.X` or `green.X` directly when a `colorPalette`
  branch can carry it.
- **Polymorphic component refs**: cast to `never` (TS escape
  hatch), not `any`. See `src/components/ui/text.tsx`.
- **Hoist consts above their consumers** — DeepSource's `JS-0357`
  rule fires across this codebase and we treat it seriously.
- **File names**: kebab-case for module files (`map-handlers.ts`,
  `site-to-gpx.ts`); PascalCase for React component files where
  the default export is a component (`Header.tsx`,
  `SiteInfoPanel.tsx`).
- **Test files**: colocated under `__tests__/`. Vitest for unit;
  Playwright `e2e/*.spec.ts` for integration.

## Commands

```sh
npm run dev               # Next dev (panda codegen first)
npm run build             # Next static export → ./out
npm run preview           # Serve ./out at :4173
npm run lint              # ESLint over src + e2e + app
npm run lint:md           # markdownlint-cli2
npm run typecheck         # panda codegen + tsc (root + e2e configs)
npm run test              # Vitest with v8 coverage
npm run test:watch        # Vitest watch mode
npx playwright test --workers=1   # e2e (CI-style serial run)
```

The pre-commit hook runs lint-staged (eslint + prettier on staged
TS/TSX, markdownlint on staged MD). Don't skip it with
`--no-verify` — fix the underlying lint instead.

## CI / bot triage

Every PR runs:

- GitHub Actions: lint, lint:md, typecheck, vitest with coverage,
  next build, Playwright e2e (Chromium), SonarCloud scan with
  coverage upload
- Netlify deploy preview
- DeepSource JavaScript + Secrets + Code Formatters
- SonarCloud Quality Gate (Action + automatic analysis)
- GitGuardian secret scan
- Inline reviews from Gemini Code Assist and GitHub Copilot

After CI is green, sweep every bot's comments before requesting
human review:

1. `gh pr view <num> --comments` and
   `gh api repos/:owner/:repo/pulls/<num>/comments` to dump every
   inline thread.
2. Bucket each comment as **fix / defer / dismiss**. Push fixup
   commits with the SHA in your reply; mark threads resolved.
3. For DeepSource, the report URL is in the commit status —
   the user has to paste it because the dashboard requires auth.
4. Tick the "bot triage" checkbox in the PR template before
   requesting human review.

For the full triage drill see the _Per-PR bot review triage_
section in `docs/plans/modernization.md`.

## Useful gotchas

- **vitest can't resolve `server-only`** — aliased to a stub in
  `vitest.config.ts`.
- **vitest can't resolve `styled-system/*`** — aliased to the
  `./styled-system` directory in `vitest.config.ts`.
- **Sonar quality gate has a "new code coverage" threshold (80%)**
  that catches new lines that aren't covered by Vitest. Map glue
  and Next-only files (`load-sites.ts`, `MapApp.tsx`) need at
  least smoke tests; the e2e suite alone doesn't count toward the
  metric.
- **DeepSource Code Formatters times out occasionally** — that's
  a DS infra hiccup, not a real lint regression. The autofix bot
  may also push a `style: format code with Prettier` commit on
  your PR; rebase your branch onto it.
- **Playwright e2e flakes in parallel** locally because the
  `vite preview` server isn't perfectly isolated; run with
  `--workers=1` (CI does this by default).
- **Netlify build env defaults to a stale Node** — `netlify.toml`
  pins `NODE_VERSION = "24"`. Don't drop the file.
- **Sonar's CI Action and Sonar's automatic analysis collide**.
  Automatic analysis must be off in the SonarCloud project
  settings (Administration → Analysis Method) for the Action's
  `lcov` upload to work.

## When to stop and ask

Before any of these, get explicit confirmation:

- Force-pushing or rewriting history on a published branch
- Adding a runtime CSS-in-JS library (Tailwind, Emotion,
  Vanilla Extract) — the project explicitly avoided these
- Switching the package manager (pnpm/yarn) — `package-lock.json`
  is npm-shaped on purpose
- Touching `panda.config.ts` Park UI preset (changing the accent
  or gray palette is a visible site-wide change)

Everything else: small, focused diffs, lint clean, tests green,
push to a feature branch, open a PR.
