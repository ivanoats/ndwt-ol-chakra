# Feature parity: replace ndwt.org

## Status

| Phase | Description                                           | State         |
| ----- | ----------------------------------------------------- | ------------- |
| 8     | Data enrichment — names, notes, fees, state/county    | Done (PR #39) |
| 9     | Per-site canonical URLs (`/sites/<slug>`)             | In review     |
| 10    | Site index / browse-by-list                           | Planned       |
| 11    | Water Safety + River Navigation + Leave No Trace      | Planned       |
| 12    | Natural World + Past & Present                        | Planned       |
| 13    | About expansion + Get Involved + Photo Gallery        | Planned       |
| 14    | Cutover — redirects, sitemap, SEO, custom-domain swap | Planned       |

This plan picks up where
[`modernization.md`](./modernization.md) left off (phases 1–7).
Same shape: one PR per phase, each independently reviewable, bot
triage on every PR before requesting human review.

## Context

After Phase 7 the site is a modern, accessible, fast Next.js +
PandaCSS map of ~150 boating sites. It still falls short of
[ndwt.org](http://www.ndwt.org) in two ways:

1. **Data gaps** — the GeoJSON we ship has no site name, no
   notes, no camping fee, no state/county. Our panel header
   reads "Columbia River — Mile 234" instead of "Blalock Canyon."
2. **Content gaps** — ndwt.org has six topical sections
   (Water Safety, River Navigation, Natural World, Past & Present,
   About, Get Involved) that our site doesn't have at all.

Goal: **fully replace ndwt.org** as the public site for the
Northwest Discovery Water Trail. After Phase 14, requests to the
old ASP URLs are redirected here, the WWTA-managed editorial
content lives here, and ndwt.org can be retired.

**Permission basis**: the Washington Water Trails Association
Executive Director has granted full reuse rights for ndwt.org's
content and copy. We'll record that in `NOTICE.md` and surface
attribution on the About page.

**Naming preference**: per-site routes use **slugs derived from
the canonical site name** (`/sites/blalock-canyon`), not the
legacy numeric IDs. The numeric ID stays in the data as a join
key for the redirect map (Phase 14) but isn't user-visible.

## Scope decisions

| Item                                      | Decision                                                                                                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-site URL shape                        | `/sites/<slug>` — kebab-case from canonical name. The legacy `web-scraper-order` ID stays as `Site.id` and is reused for the Phase 14 redirect map.                                                                        |
| Content authoring format                  | MDX under `content/`; rendered via per-route `page.tsx` that imports the MDX. Lets us embed PandaCSS-styled callouts without giving up static export.                                                                      |
| Site name source                          | One-time scrape of ndwt.org's per-site pages (`site.asp?site=<id>`) to populate name, state, county, camping fee, notes. Merged directly into `public/data/ndwt.geojson` feature properties (see `public/data/README.md`). |
| Editorial content source                  | One-time scrape of ndwt.org's static pages, converted to MDX, hand-edited for voice + accuracy + accessibility. Each page footer cites "Originally published on ndwt.org; reused with permission from WWTA."               |
| Forum / Trip Reports / Donate / Volunteer | Out of scope — link out to WWTA's existing flows. Phase 13 adds the links.                                                                                                                                                 |
| Press Coverage                            | Permanently deferred — low engagement value.                                                                                                                                                                               |
| Photo Gallery                             | Phase 13, conditional on WWTA having a photo library to point at. Otherwise deferred.                                                                                                                                      |
| Search                                    | Out of scope for now — site index list (Phase 10) covers most of the use case. Revisit after Phase 14 if user feedback asks for it.                                                                                        |

## Per-PR bot review triage

Same drill as the modernization plan — see
[`modernization.md` § Per-PR bot review triage](./modernization.md#per-pr-bot-review-triage).

## Build sequence (one PR per phase)

### Phase 8 — Data enrichment

**Goal**: every site has a display name, plus state, county,
camping fee, and notes when ndwt.org has them.

- Add a one-shot scraper script
  (`scripts/scrape-ndwt-sites.ts`) that walks every
  `web-scraper-start-url` from the GeoJSON, extracts:
  - Site name from `<title>` / `<h1>`
  - State, county, camping fee, notes from the detail table
  - Sanitizes free-text fields (strip HTML, normalize whitespace)
- Output: scraped enrichment fields (`name`, `state`, `county`,
  `campingFee`, `notes`) merged directly into each feature's
  `properties` in `public/data/ndwt.geojson`. The script is
  **one-shot** — re-run manually if ndwt.org changes; not part of
  the build.
- `NOTICE.md` at repo root documents the WWTA permission grant
  and content provenance. Linked from About and Footer.
- `public/data/README.md` documents the GeoJSON schema for
  external GIS consumers.
- Domain model updates:
  - `Site.name: string` (required after enrichment)
  - `Site.state?: string`, `Site.county?: string`,
    `Site.campingFee?: string`, `Site.notes?: string`
  - `Site.id` already carries the `web-scraper-order` value
    (the legacy ndwt.org primary key) — kept for the Phase 14
    redirect map. No separate `legacyId` field needed.
- Parser reads the merged properties straight from the GeoJSON.
  If `name` is somehow missing (broken data), fall back to a
  generated `"Columbia River — Mile 234"` placeholder so the
  build doesn't crash.
- `SiteInfoPanel` header now shows the site name. Add conditional
  rows for state, county, camping fee, notes.
- Tests: parser reads merged props; fallback when name absent;
  panel snapshot with all fields populated.
- Verify: every marker's panel header shows a real name; sample
  three sites against ndwt.org for accuracy.

> Phase 8 originally shipped name/state/county/campingFee/notes in
> a separate `ndwt-enriched.json` sidecar. A follow-up refactor
> merged those fields into `ndwt.geojson` so there's a single
> dataset on disk, a simpler loader (one fs read, no fallback
> branch), and a richer published asset for external GIS reuse.
> The retrospective bullets above describe the post-merge shape.

### Phase 9 — Per-site canonical URLs

**Goal**: every site has its own page at `/sites/<slug>`,
shareable, bookmarkable, indexable, and printable.

- Slug derivation: `slugify(site.name)` →
  `"Blalock Canyon"` → `"blalock-canyon"`. Collision handling
  (3 known cases — Hood Park, Fishhook Park, Granite Point):
  1. If `slugify(name)` is unique → use it.
  2. Otherwise try `slugify(name)-mile-<N>` (river mile).
     This resolves Hood Park (mile 2 vs 2.5 → `hood-park-mile-2`
     vs `hood-park-mile-2-5`) and Fishhook Park (different
     rivers, same mile-suffix idea).
  3. If still colliding (Granite Point: both records sit at
     Snake mile 113 — apparently a true source-data duplicate),
     fall back to `slugify(name)-<site.id>` (the
     `web-scraper-order` value) for guaranteed uniqueness. Ugly
     URL, but only the duplicate site bears it.

  Slug computed once at parse time and stored on `Site.slug`.

- New route: `app/sites/[slug]/page.tsx` (server component) using
  `generateStaticParams` to enumerate all slugs. Static export
  emits one HTML file per site.
- Detail page renders the same content as the panel plus a
  print-friendly layout (tested with Playwright's
  `emulateMedia({ media: 'print' })`).
- Map marker click behavior:
  - **Default**: open the in-page panel (current UX) and
    push `?site=<slug>` to the URL via `history.replaceState` —
    so the URL is shareable without a full navigation.
  - **Direct visit** to `/?site=<slug>` opens the panel on load.
  - **`/sites/<slug>` direct visit** renders the dedicated page
    (no map). The page has a "View on map" link back to
    `/?site=<slug>`.
- Per-page metadata: `generateMetadata` per site emits
  `<title>{site.name} — NW Discovery Water Trail</title>` and an
  OpenGraph description from the river/mile/bank.
- Tests:
  - Vitest: slug derivation including collisions.
  - Playwright: deep-link `/?site=blalock-canyon` opens the
    panel; visiting `/sites/blalock-canyon` renders the detail
    page; print media query yields a single-column layout.
- Verify: `npm run build` produces ~150 `out/sites/<slug>.html`
  files; sharing a URL on Slack/iMessage produces correct OG.

### Phase 10 — Site index / browse-by-list

**Goal**: a sortable, filterable list of every site for the
"I know the name but not the location" use case.

- New route: `app/sites/page.tsx` (server component) listing
  every site with: name, river, mile, bank, top-level facility
  badges, link to `/sites/<slug>`.
- Default sort: by river then mile. Toggle: alphabetical.
- Client-side filter (Zustand or `useState`): name substring,
  facility checkboxes, river dropdown.
- Header nav adds "Sites" link pointing at `/sites`.
- Tests:
  - Vitest: filter logic on a fixture of 5 sites.
  - Playwright: type "blalock", verify result narrows to 1; pick
    the result, land on `/sites/blalock-canyon`.
- Verify: page loads under 200 ms server time; filter is
  instant on a 150-row list with no virtualization needed.

### Phase 11 — Operational content (Water Safety, River Navigation, Leave No Trace)

**Goal**: the editorial content boaters actually need on the
water lives here.

- Scrape ndwt.org pages once (manual; not a build step) into
  MDX under `content/`:
  - `content/water-safety/{index,weather,barge-traffic,communications,reading-the-rivers,float-plans,safety-gear}.mdx`
  - `content/river-navigation/{index,lock-and-dam,portage-guide}.mdx`
  - `content/leave-no-trace.mdx`
- Each MDX file gets a hand-edit pass for: voice consistency
  (full "Northwest Discovery Water Trail" on first reference),
  accessibility (alt text, heading order), broken-link triage,
  and a permission attribution footer.
- Routes: `app/water-safety/[[...slug]]/page.tsx`,
  `app/river-navigation/[[...slug]]/page.tsx`,
  `app/leave-no-trace/page.tsx`. Each imports the MDX, wraps in
  the existing layout, generates static metadata.
- Header nav: add "Safety", "Navigation", "Leave No Trace"
  (consider grouping under a single "Resources" dropdown to
  avoid header overflow on mobile).
- Tests: Playwright smoke — visit each new route, check for an
  `h1` and the attribution footer.
- Verify: print Lighthouse a11y score for one sub-page; aim for
  ≥ 95.

### Phase 12 — Cultural / natural content (Natural World, Past & Present)

**Goal**: the historical and ecological context that makes the
trail more than a marker dataset.

- MDX under `content/natural-world/{index,flora-fauna,geology,invasive-species}.mdx`
  and `content/past-and-present/{index,tribal-communities,early-explorers,trade-and-industry}.mdx`.
- Tribal Communities page gets an explicit content review with
  WWTA before merge — the original ndwt.org copy is from the
  early 2010s and may need updating to reflect current tribal
  partnerships and language preferences.
- Routes mirror the safety/navigation pattern.
- Header nav: "Natural World", "Past & Present" added under
  Resources.
- Tests: Playwright smoke per route.
- Verify: MD lint passes; a11y check on one page.

### Phase 13 — About expansion + Get Involved + (optional) Photo Gallery

**Goal**: the meta-pages — who runs the trail, who funded it,
how to get involved.

- `app/about/partners/page.tsx` — funding (NPS / Lewis & Clark
  Challenge Cost Share), management (WWTA), agency partners
  (USACE, BLM, state parks, tribal partners). Logos with proper
  alt text via `next/image`.
- `app/about/history/page.tsx` — project history MDX.
- `app/about/contact/page.tsx` — mailto link or pointer to WWTA
  contact form. No custom form (no backend).
- `app/get-involved/page.tsx` — three outbound CTAs: Volunteer
  (WWTA), Donate (WWTA), Trip Reports (WWTA forum or wherever
  WWTA hosts these now). Confirm exact URLs with WWTA before
  merging.
- Photo Gallery: include only if WWTA hands over a photo set
  with usage rights. Implementation: `app/gallery/page.tsx`
  rendering a Panda-styled grid; clicking a photo opens an Ark
  UI Dialog with full size + caption. If no photos available
  by start of Phase 13, defer to a follow-up phase.
- Header nav: collapse less-used items into a `<details>`
  "Resources" dropdown so the bar doesn't overflow.
- Tests: Playwright smoke; verify all outbound links return 200.
- Verify: full nav reachable on mobile (320px width).

### Phase 14 — Cutover

**Goal**: ndwt.org redirects to this site; search engines
re-index correctly; the old ASP site can be retired.

- `app/sitemap.ts` emits a per-route URL list including all
  `/sites/<slug>` pages and all editorial routes.
- `public/robots.txt` allows all crawlers, points at sitemap.
- `next.config.mjs` `metadataBase` set to the production
  domain.
- Per-page OpenGraph + Twitter Card metadata audited.
- Netlify `_redirects` (or `netlify.toml [[redirects]]`):
  - `301 /ndwt/explore/site.asp?site=:id /sites/<slug>` —
    legacy-ID-to-slug map generated from the merged GeoJSON
    (`web-scraper-order` → `slug`).
  - `301 /ndwt/safety/* /water-safety/*` — pattern map for
    each section.
  - Catch-all `301 /ndwt/* /` for anything not explicitly
    mapped.
- Custom domain (`ndwt.org` or whatever WWTA picks) added in
  Netlify. DNS swap is a manual step coordinated with WWTA's
  domain registrar; document it in `docs/operations/dns-cutover.md`.
- Final audits before requesting the DNS swap:
  - Lighthouse: Performance ≥ 90, A11y ≥ 95, Best Practices ≥
    95, SEO ≥ 95 on three sample routes (`/`, `/sites/<slug>`,
    `/water-safety/`).
  - Manual screen-reader pass with VoiceOver on macOS.
  - Broken-link sweep (`linkinator` or similar) on the deploy
    preview.
- Coordinate with WWTA on social-media + email announcement
  pointing at the new site.

## Files to create / modify

Created:

- `scripts/scrape-ndwt-sites.ts` (one-shot enricher; merges into
  `ndwt.geojson` in place)
- `public/data/README.md` (dataset schema for external consumers)
- `NOTICE.md` (permission attribution)
- `app/sites/[slug]/page.tsx`
- `app/sites/page.tsx` (index)
- `app/water-safety/`, `app/river-navigation/`,
  `app/leave-no-trace/`, `app/natural-world/`,
  `app/past-and-present/`, `app/about/{partners,history,contact}/`,
  `app/get-involved/`, optionally `app/gallery/`
- `content/**/*.mdx` (editorial content)
- `app/sitemap.ts`, `public/robots.txt`,
  `public/_redirects` (or equivalent in `netlify.toml`)
- `docs/operations/dns-cutover.md`

Modified:

- `src/domain/site.ts` — add `name`, `state`, `county`,
  `campingFee`, `notes`, `slug` (slug lands in Phase 9; `Site.id`
  already carries the legacy ndwt.org ID for redirects)
- `src/adapters/inbound/next/load-sites.ts` — single fs read of
  the merged GeoJSON
- `src/components/panels/SiteInfoPanel.tsx` — name in header,
  conditional rows for new fields
- `src/components/layout/Header.tsx` — Sites + Resources nav
- `next.config.mjs` — MDX support, metadataBase
- `package.json` — `@next/mdx`, `slugify` (or hand-rolled)

## Verification (end of Phase 14)

1. Every marker shows a real name in the panel.
2. `/sites/<slug>` exists for every site; share a URL → preview
   card shows site name + river segment.
3. Site index `/sites/` lists every site, filter narrows to the
   right results.
4. All editorial routes (`/water-safety/*`,
   `/river-navigation/*`, `/leave-no-trace`,
   `/natural-world/*`, `/past-and-present/*`,
   `/about/*`, `/get-involved`) render with attribution footers.
5. `out/sitemap.xml` lists every public route.
6. `_redirects` maps every legacy ASP URL pattern to a 301.
7. Lighthouse scores on three sample routes meet the targets.
8. WWTA reviewer signs off on the Tribal Communities page and
   the Partners page.
9. DNS swap executed; ndwt.org now serves this site.

Done when: a paddler can do every task on the new site that
they could do on ndwt.org, the old ASP site is retired, and
search results for "northwest discovery water trail" land on
`/` or the relevant editorial route within 30 days of cutover.

## Open questions

1. **Domain ownership**: who controls the ndwt.org DNS today —
   WWTA, the legacy NPS contact, or a personal account that
   needs to be transferred? Phase 14 can't ship until this is
   answered.
   Answer: WWTA controls the domain and will coordinate the DNS swap when we get to Phase 14.
2. **Tribal Communities content**: who at WWTA owns the review?
   Some original copy uses early-2010s phrasing that may need
   updating in consultation with the relevant tribal partners.
   Answer: defer to WWTA's judgment on this one; we have permission to reuse
3. **Photo Gallery**: does WWTA have a usable photo library,
   and do those photos have clear reuse rights (model releases
   for any people, location-tagged for site association)?
   Answer: WWTA has a wordpress site with NextGen Gallery plugin that has photos
   with usage rights; we can link to that in Phase 13 without building our own
   gallery page, or we can build a gallery page that sources from the Wordpress
   library via RSS or similar. Defer the decision until Phase 13 when we know
   more about the photo set and WWTA's preferences. I do have admin access to
   the wordpress site so I can install plugins or make config changes if needed
   to get the photos accessible to our frontend.

4. **Volunteer / Donate / Trip Reports outbound URLs**: the
   exact WWTA URLs to link to in Phase 13 need confirmation.
5. **Email alias**: Phase 13's Contact page wants a `mailto:`
   target. Should it be a WWTA address (`info@wwta.org`?), or a
   project-specific alias (`maintainers@ndwt.org`)?
   Answer: <info@wwta.org>

## See also

- [`modernization.md`](./modernization.md) — Phases 1–7 (the
  baseline this plan builds on)
- [`../gap-analysis.md`](../gap-analysis.md) — the source
  inventory that drove the phase ordering above
