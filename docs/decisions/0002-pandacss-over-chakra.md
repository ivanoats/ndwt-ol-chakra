# ADR 0002: PandaCSS + Park UI preset over Chakra UI 2

- **Status:** Accepted (Phase 5, 2026-04)
- **Deciders:** Ivan Storck

## Context

Phases 1–4 used **Chakra UI 2** for the styling system. Chakra v2 is
built on Emotion's runtime CSS-in-JS — stylesheets are computed and
injected during render. By Phase 5 the install had:

- `@chakra-ui/react`, `@chakra-ui/icons`, `@chakra-ui/system`
- `@emotion/react`, `@emotion/styled`
- `framer-motion` (a Chakra peer dep)

The App Router migration in Phase 4 worked, but Chakra v2 + RSC has
known FOUC + hydration awkwardness, and the runtime CSS engine
adds bundle weight to a site whose JavaScript surface is otherwise
just OL + a small Zustand slice.

The Phase 5 plan was to swap Chakra for the
**PandaCSS + Park UI + Ark UI** stack from the same authors as
Chakra (Segun & co.).

## Decision

Adopt:

- **PandaCSS** as the styling engine — build-time atomic CSS, no
  runtime, type-safe tokens generated into `./styled-system/`.
- **`@park-ui/panda-preset`** for design tokens and recipes
  (Radix-style 12-step palettes, configured for accent: green,
  gray: sage, radius: md).
- **Ark UI** (`@ark-ui/react`) for headless primitives — `Dialog`
  powers our Drawer; future popovers, tooltips, dropdowns will
  use it.
- **`next-themes`** for light/dark color mode (no FOUC, App
  Router-aware).
- **`lucide-react`** for icons (Park UI's recommended pairing).

We **hand-rolled** the nine UI components we actually need
(`box`, `stack`, `text`, `heading`, `badge`, `link`, `button`,
`icon-button`, `drawer`) under `src/components/ui/`, rather than
adopting Park UI's full copy-paste component library. The Park UI
preset carries the design tokens; the rendered components are our
own thin wrappers.

Removed:

- `@chakra-ui/*`, `@emotion/*`, `framer-motion`
- `src/theme.ts` (theme now lives in `panda.config.ts`)

## Consequences

**Wins:**

- Zero runtime CSS-in-JS — Panda compiles all styles to atomic
  classes at build time. The hydration bundle drops several
  hundred KB (Chakra + Emotion + framer-motion combined).
- No FOUC + no SSR/CSR Emotion cache choreography. Static export
  works exactly as it would for Tailwind.
- Type-safe design tokens. The `colorPalette` virtual token
  pattern lets a single component render in any palette by
  setting `colorPalette: 'green' | 'sage' | ...`.
- Component primitives are **in our repo, not behind a
  dependency boundary**. When Ark UI's Dialog API changes, we
  update one file. When we want a non-modal Drawer, we add
  `modal={false}` to one place.

**Costs / hazards:**

- Park UI's full component library is shadcn-style copy-paste.
  We chose to hand-roll instead — for nine components that's
  fine, but if we add many more we should consider running
  the Park UI CLI rather than adding dozens of bespoke files.
- `FacilitySet` had to be refactored from a class to a plain
  array because Park UI / Panda doesn't change anything about
  the React Server Components serializer — class instances
  still can't cross the RSC boundary. This was a Phase 4 fix
  that this ADR documents because it's load-bearing for the
  styling stack to "just work."
- PandaCSS's codegen step (`panda codegen`) is required before
  TypeScript can resolve `styled-system/css` etc. We prefix dev
  / build / typecheck / test scripts with
  `panda codegen --silent` — not free, but invisible in normal
  use.
- Ark UI's Dialog mounts even when closed (`data-state="closed"`,
  `hidden`), unlike Chakra v2's Drawer which unmounted. Tests
  needed updating to assert visibility rather than DOM presence.
  The buffered-`displaySite` pattern from Phase 3 (Chakra-era
  workaround for the close-animation flash) became unnecessary.

## Alternatives considered

### Tailwind CSS

- **Why considered:** It's the obvious default for a static-CSS
  pipeline.
- **Why rejected:** The plan explicitly excludes Tailwind ("No
  Tailwind"). PandaCSS's recipe / token model is closer to what
  we already had with Chakra and lets us write the `css({...})`
  call site syntax that's most natural for component-local
  styles. Tailwind's `class="..."` strings would have been a
  bigger context shift.

### Stay on Chakra UI 2 indefinitely

- **Why considered:** It was working.
- **Why rejected:** Chakra v3 (Park UI essentially) was the
  evolution path the Chakra team was taking anyway. Going
  there directly via Park UI gets us off Emotion, off framer-
  motion, and off Chakra v2's hydration model. The Chakra v2
  → v3 migration would have been roughly the same diff as
  Chakra v2 → Park UI.

### Vanilla Extract

- **Why considered:** Build-time CSS-in-JS, type-safe, popular.
- **Why rejected:** Smaller ecosystem of recipes/presets;
  Park UI's preset gives us a Radix-grade design system out of
  the box. Vanilla Extract would have been a pure-styling pick
  with no component primitives included.

### Plain CSS Modules

- **Why considered:** Simplest possible answer.
- **Why rejected:** No design tokens, no recipes, no primitive
  components. Would have meant rebuilding most of what Park UI
  gives us by hand.

## Notes

- The migration was PR
  [#34](https://github.com/ivanoats/ndwt-ol-chakra/pull/34).
- See [`docs/architecture/components.md`](../architecture/components.md)
  for what each `src/components/ui/*` file does.
- See [ADR 0001](./0001-nextjs-app-router.md) for the static-
  export decision that motivates removing runtime CSS-in-JS.
