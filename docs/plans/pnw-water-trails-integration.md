# Integrate the eight PNW water trails into one map site

## Status

Proposed — not yet started. Successor scope to the Phase 14
ndwt.org cutover described in
[`feature-parity.md`](./feature-parity.md). This document is a
plan, not a commitment.

## TL;DR

[`docs/gap-analysis-wwta.md`](../gap-analysis-wwta.md) draws a
boundary: this site owns the **data + interactive map + per-site
detail** surface for NDWT; wwta.org owns the org-wide
member/donation/event flows. The boundary works because the two
sides have non-overlapping strengths.

This plan extends the **left** half of that boundary across all
eight WWTA trails. The architecture is already shaped for it
(hexagonal, repository port, build-time GeoJSON adapter); the
work is mostly data, a `Trail` entity, and a few new routes.
WWTA continues to own the right half — we link out for join /
donate / events / shop / podcast.

The result: one fast static-export site at **`map.wwta.org`**
that is the canonical interactive map for **every** PNW water
trail, while `wwta.org` stays the canonical member-facing org
site. The `map.` subdomain keeps brand authority with WWTA,
sidesteps the "what do we name a multi-trail hub" question, and
lets us treat WWTA's WordPress as the CMS for editorial content
across all eight trails (see _WordPress as the editorial CMS_
below).

### Foundational principle: open-source mapping stack

The map layer stays **OpenLayers + OSM-family tiles + open
public data feeds** (NOAA, NWS, USGS, WSDOT, OpenStreetMap,
Wikimedia). We do not adopt ArcGIS, Mapbox proprietary, Google
Maps, or any other vendor-locked stack as a foundation. The
existing Vite→Next.js modernization picked this stack
deliberately and we extend, not replace.

This matters because the closest analog site,
[BC Marine Trails](https://www.bcmarinetrails.org/map/), embeds
its map as an ArcGIS Experience Builder iframe pointing at
`experience.arcgis.com/experience/29da9c29de3947988ab663060abcfe05/`.
Their feature set is excellent (and the WWTA Executive Director
cited it as a reference), but the implementation is not what we
want — it ties content updates to ArcGIS Online seats, hides
data behind Esri JS APIs, and makes the public map a
commercial-cloud dependency. We **adopt their feature ideas,
not their technology choices**.

ArcGIS appears in this plan in exactly one place: a one-time
data import for Cascadia (Phase 15a). If WWTA happens to
publish a hosted FeatureLayer for any trail, we read it once
via the public REST endpoint and **commit the result** as
GeoJSON. That's a build-time data pull, not a runtime
dependency on Esri.

### Source of truth for geographic data

GeoJSON files in `public/data/trails/<trail-slug>.geojson` are
the canonical store for all site coordinates, names, river
metadata, and facility flags. They're committed to the repo
and served raw at `https://map.wwta.org/data/trails/*.geojson`
for any third-party app, partner org, or journalist who wants
the dataset. NDWT already follows this pattern at
`/data/ndwt.geojson`; the multi-trail rollout extends it.

What lives where:

| Data | Source of truth | Edit flow |
|---|---|---|
| Site coordinates, name, river, mile, bank, facilities | `public/data/trails/<slug>.geojson` in this repo | PR (engineer) or via a git-backed CMS at `/admin/` — Keystatic recommended; see below |
| Trail metadata (name, region, color, bbox) | `public/data/trails/manifest.json` in this repo | PR |
| Trail editorial prose (overview, safety, history) | WWTA WordPress, slugs `<trail>-*` | WordPress admin → daily-cron rebuild |
| Photos | WWTA NextGen Gallery (member-tagged) | WordPress admin → next build |
| Tides / weather / river gauges / ferries | NOAA / NWS / USGS / WSDOT (live) | Client-fetched per request |
| First Nations territories | Native Land Digital GeoJSON API | Pulled & cached at build |
| First Nations site associations | `public/data/trails/<slug>.geojson` (per-site `nations` field) | PR with nation-advisory review |

**ArcGIS is never in the source-of-truth column.** If we
import from a WWTA ArcGIS FeatureLayer for Cascadia (Phase
15a), the resulting GeoJSON is committed and the ArcGIS layer
becomes downstream — WWTA edits get pulled by re-running the
import script in a PR, not by a live sync.

#### Editor workflow for non-engineers

WWTA staff and steward volunteers aren't going to learn `git`
to update a campsite. The plan needs an answer for how
non-engineer edits land in the repo. Three workflow options,
in order of investment:

- **A. PRs via the GitHub web UI.** Cheap to start, awkward to
  scale. Editor learns one workflow: edit JSON in browser →
  GitHub web → suggest change. Works for occasional fixes,
  not for routine maintenance of 400+ sites.
- **B. A git-backed CMS mounted at `/admin/`.** A static-JS
  admin UI configured to edit `public/data/trails/*.geojson`,
  that opens PRs as the editor's GitHub identity. Open
  source, no server, fits the static-export model. Editors
  get a friendly site-picker form (and an OpenLayers map-edit
  custom widget we build); the diff lands as a PR we still
  review.
- **C. Spreadsheet → GeoJSON pipeline.** WWTA maintains a
  Google Sheet per trail, a CI job regenerates the GeoJSON
  daily. Simplest for editors, but loses field-level audit
  trail and forces a 1:1 column mapping that breaks down for
  nested data (multi-nation site associations, multi-trail
  membership).

##### Which git-backed CMS for option B?

Five candidates evaluated against our constraints (preserve
GeoJSON-in-repo SoT, static-export hosting, custom map-edit
widget, 1–3 editors, open source preferred):

| CMS | Backing model | Maintenance | Custom map widget | SoT fit | Operational cost |
|---|---|---|---|---|---|
| **Keystatic** | Git-backed (commits via GitHub API) | Active (Thinkmill / KeystoneJS team) | First-class TS custom field components | Native | Zero — static JS |
| **Decap** | Git-backed (same model) | Lukewarm — community fork after Netlify wound down active dev | Possible via `registerWidget`, dated React ecosystem | Native | Zero — static JS |
| **TinaCMS** | Git-backed locally; most teams use Tina Cloud GraphQL | Active, dual-license open + paid cloud | Custom field UIs supported, heavier setup | Self-host fits; Tina Cloud adds vendor surface | Cloud paid; self-host adds Node service |
| **Payload** | Headless DB (Mongo / Postgres) | Very active, polished | First-class custom components | **Breaks SoT** — DB is canonical; needs export-on-publish webhook | DB + Node service, or Payload Cloud paid |
| **Sanity** | SaaS document store (GROQ) | Very active, polished | Custom input components are excellent | **Breaks SoT** — Sanity Cloud is canonical | Free tier; vendor lock-in |

Shortlist: **Keystatic vs Decap** — they're the only two
that preserve "git is the source of truth" without an export
pipeline. Payload and Sanity are stronger products for richer
content workflows but force a model where the DB or cloud is
canonical and the GeoJSON in `public/data/` becomes a
generated artifact — reintroducing the always-on dependency
this plan rejected. TinaCMS is git-backed in theory but most
real-world deployments lean on Tina Cloud, putting us back in
vendor territory.

Between the two finalists: **Keystatic wins.** Same
source-of-truth shape, materially better editor UX, TypeScript
schemas that match our domain types, actively maintained by a
team that ships, and the custom-field API for the map-edit
widget is cleaner than Decap's `registerWidget`. Decap's only
remaining advantage is inertia (more community widgets,
longer-lived ecosystem), and inertia is not a feature.

Recommended workflow shape: **start with A through Phase 18
(validates the data model with small datasets), adopt
Keystatic at `/admin/` before Phase 23 when Cascadia adds 75
sites in one go.** Decap stays in the doc as a fallback only
if Keystatic's GitHub-OAuth flow turns out to be awkward for
WWTA's team setup. Option C is a fallback below that.

##### The GitHub-account hurdle

Any git-backed CMS authenticates editors against GitHub. For
WWTA's 1–3 staff editors this is a one-time onboarding step:
free personal GitHub account, added as an Outside Collaborator
scoped to the data repo with **Triage** or **Write** role on
the `public/data/trails/` path only. No code access needed.

Where this gets uncomfortable is **occasional contributors**
— a board member or volunteer site steward who wants to fix
one waypoint, once a year. Three options if that wave shows
up:

- **A. Status quo: free GitHub accounts for everyone who
  edits.** Path of least resistance for the 90% case. GitHub
  accounts are free, the friction is one signup form, and per-
  editor commit attribution is the upside.
- **B. Keystatic with a custom auth proxy.** Keystatic's auth
  layer is pluggable; the proxy can authenticate editors
  against an existing identity (Google Workspace, Auth0,
  magic-link email) and commit on their behalf via a service
  account. Costs: more moving parts; loses per-editor
  attribution unless we encode the editor identity in the
  commit message.
- **C. A "submit a fix" form, no auth.** A simple typeform-
  shaped UI that emails a structured proposed-edit to a staff
  reviewer, who applies it via the regular CMS path. Treats
  occasional volunteers as proposers rather than committers.
  Cleanest for occasional contributors; doesn't try to be a
  full editing surface.

Default: **A through go-live; layer on C if the
occasional-contributor flow becomes a real source of
friction.** B is a heavier engineering investment that we
should only take on if A and C both fail to cover the
realistic editor population.

#### When would we adopt PostGIS?

The question came up — worth recording the deferral with
explicit triggers so the decision isn't relitigated every
phase.

PostGIS is **not** in scope for this plan. At ~400 sites with
1–3 editors and a static-export hosting model, GeoJSON-in-repo
+ Keystatic (or Decap as fallback) covers the editing workflow, and the spatial
queries we'd want (nearest-station precomputation, sites-near-
me, graph routing) all happen at **build time** or **client
side** without needing a spatial database. Adopting PostGIS
would add an always-on service to monitor, a build-time secret
that breaks "just deploy from git," and a second source of
truth fighting with the committed GeoJSON.

The decision flips if at least two of these become true:

- **Scale**: >2000 sites in one dataset (e.g., expanding to
  cover all PNW including BC outer coast and SE Alaska).
- **Concurrency**: 5+ non-engineer editors making routine
  changes simultaneously, where PR-merge conflicts on the
  GeoJSON become a daily pain.
- **Server-side spatial ops**: a feature that needs sub-second
  response on queries client-side JS can't handle (interactive
  trip planning where a departure-time slider reflows the
  route live; multi-trail trans-watershed analytics).
- **Provenance queries**: stakeholder reporting needs that
  exceed what `git log` expresses ("show every facility-flag
  change in 2026 across all trails grouped by editor").
- **Partner integration**: a data partner like LCREP already
  runs PostGIS, and our import for their trail naturally
  reads from theirs. (This is a *partner* PostGIS, not us
  running one.)

If we ever do adopt it, the cleanest shape is **Postgres as a
read-only downstream replica fed from the committed GeoJSON**,
not a replacement for git. GeoJSON stays canonical; Postgres
becomes a query cache that powers specific server-side
features. Same source-of-truth rule, different query layer.

## What's new on each side

A condensed inventory of features, drawn from
[`gap-analysis-wwta.md`](../gap-analysis-wwta.md) and a
fresh sweep of wwta.org's eight trail pages.

### This site today

- OpenLayers map with three switchable base layers (OSM, USGS
  Topo, OpenTopoMap) and two overlays (OpenSeaMap, Hiking
  Trails) — `src/components/map.tsx`, `LayerSwitcher.tsx`.
- ~150 NDWT sites rendered as a single green vector layer,
  click-to-open drawer with full site metadata.
- `Site` domain (`src/domain/site.ts`) with nine facility flags
  (`src/domain/facility.ts`), riverSegment / riverMile / bank
  context, county / state, season, camping, contact.
- `/sites/` index with name search, river dropdown, facility
  toggles, sort by river+mile or A→Z.
- Per-site canonical URLs at `/sites/<slug>/` (159 pages).
- Per-site GPX waypoint download
  (`src/adapters/outbound/site-to-gpx.ts`).
- Editorial MDX cluster: water-safety, river-navigation,
  natural-world, past-and-present, leave-no-trace,
  trip-planning, get-involved, about/\*.
- No accounts, no CMS, no third-party live data.

### wwta.org today

- WordPress install with a sub-section per trail. NDWT has the
  fullest editorial port (~25 pages); other trails have between
  one info page and a small site list.
- **Cascadia Marine Trail** is the flagship: 75 named sites
  listed alphabetically on a single page; an ArcGIS story map
  (separate beta URL); high-resolution PDF map; print
  guidebook for members; reservations system; site stewards
  program.
- **Willapa Bay Trail** lists 12 access points with brief
  amenity notes, no map.
- **Lakes-to-Locks Trail** is a historical narrative page only
  — no sites, no map.
- **Lower Columbia / Pend Oreille / Kitsap Peninsula / Maritime
  Heritage / Northwest Discovery** range from light info pages
  to redirects back to NDWT.
- Org-wide: member login, JOIN / DONATE flows, event calendar
  (Events Calendar plugin), blog (~10 NDWT-relevant posts),
  partners directory, NextGen photo gallery (544 items, mostly
  Cascadia & Willapa), shop, podcast.
- WordPress REST API is open for public reads; NextGen Gallery
  needs an Application Password.

### Net gaps relative to a unified PNW water-trails hub

| Capability | Source today | Gap |
|---|---|---|
| Vector interactive map | This site (NDWT only) | Need same for the other 7 |
| Per-site detail pages | This site (NDWT only) | Need same for ~150–250 more sites |
| Facility filtering / search | This site (NDWT only) | Need data for other trails |
| GPX export per site | This site (NDWT only) | Trivial extension once data lands |
| Multi-waypoint route + day-itinerary | Neither | New capability |
| Tides / currents / weather / river gauges | Neither | New capability |
| ArcGIS story map for Cascadia | wwta.org (beta) | Decide: replace or link out |
| 75-site Cascadia list with detail | wwta.org (HTML only) | Digitize to GeoJSON |
| Member login / donate / events / shop | wwta.org | Stay there; link out |
| Editorial pages for non-NDWT trails | wwta.org | Either link out or pull via WP REST |
| Photo gallery | wwta.org NextGen | Stay there or pull metadata |

## What we propose to build

A multi-trail extension of this site, anchored on three
additions:

1. A `Trail` domain entity, with `Site` gaining
   `trailIds: TrailId[]`. Sites that sit on more than one
   trail (Anderson Island, Blake Island, Sand Island) are first
   class.
2. One `<trail>.geojson` per trail under `public/data/trails/`,
   loaded at build time by the existing inbound-adapter shape.
   NDWT moves from `public/data/ndwt.geojson` to
   `public/data/trails/ndwt.geojson` to match.
3. A `/trails/` route family — index, per-trail landing,
   per-trail filtered map view — alongside the existing
   `/sites/` index, which now carries trail badges.

After that lands, we layer in: tide/current/weather adapters,
multi-waypoint route + GPX, and a small set of editorial pulls
from wwta.org's REST API for trails we don't author content
for.

## Scope boundary (unchanged)

The same boundary from `gap-analysis-wwta.md` continues to
hold:

- **This site owns**: trail + site data, the interactive map,
  per-site detail, facility filters, GPX, conditions overlays.
- **wwta.org owns**: membership, donations, events, shop,
  podcast, NextGen photo gallery, member-only PDFs and print
  guidebook.

Anywhere the user needs to spend money, log in, or RSVP, we
link out to wwta.org. Anywhere the user is exploring,
filtering, or planning, they stay here.

## Features inspired by BC Marine Trails

A scan of BCMT's organization (`dev_bcmt` on ArcGIS Online,
~87k views on the public map, plus the related items they
publish openly) shows a small set of features worth adopting,
all reproducible on our OpenLayers stack with open data:

- **First Nations / Indigenous territories overlay.** BCMT
  publishes a `FirstNations_Territories_TDC_Sites_Table` layer
  that joins each marine site to its host nations. The
  ancestral waters of Coast Salish nations, the Chinook,
  Yakama, Umatilla, Nez Perce, Columbia Plateau peoples cover
  every trail in our scope. WWTA already cares about this in
  prose (see the Tribal Communities sub-page); the missing
  piece is a map layer. Source candidates:
  - **Native Land Digital** (`native-land.ca`) publishes a
    public GeoJSON API for territories — free for non-commercial
    use, attribution required.
  - State-level Tribal Lands datasets (WA DNR, Oregon
    Geospatial Enterprise Office) for officially recognized
    reservation boundaries.
  - Per-nation review of the layer copy and presentation, with
    a clear opt-in / removal path if any nation prefers
    different framing.
- **Marine chart overlay.** BCMT layers Canadian Hydrographic
  Survey (CHS) WMS tiles. The US analog is **NOAA ENC raster
  tiles** at `tileservice.charts.noaa.gov` — public, free, no
  key. Adds bathymetry, navigation aids, anchorages, and
  hazard markings that OpenSeaMap (which we already have) does
  not. Bundle the two as a "Marine charts" overlay group.
- **Hazards and navigation alerts as a layer.** BCMT renders
  hazards (rip rocks, log booms, surge channels) as
  distinguishable site categories. Worth promoting "hazard"
  to a `Site.kind` value alongside "access" so a paddler
  reading the map can see what to avoid as well as where to
  land. This needs data — start with a small hand-curated set
  for known bad spots in the Cascadia and NDWT corridors.
- **Public vs Member view.** BCMT runs two ArcGIS Experiences:
  a public map and a members-only one. Reproducing this on
  our side does **not** mean gating content here. It means: a
  site detail panel can show a "more for WWTA members on
  wwta.org" CTA where extra-detail content (member guidebook
  pages, reservation flows for Cascadia, exclusive Anderson
  Island camping info) lives. The gate stays on wwta.org; we
  show the doorbell.
- **Site stewards / condition reporting (read-only).** BCMT's
  member map exposes recent condition reports per site. WWTA
  has a stewards program for Cascadia. If WWTA exposes
  steward updates as data (a WordPress custom post type would
  do it), our site-detail panel can render the latest report
  with a date and author. We don't build the reporting UI;
  we render what they publish.
- **A "compare features" page.** BCMT has a public-vs-member
  comparison matrix. Worth borrowing as `/about/membership/`
  on our side, framing what's free here, what's free on
  wwta.org, and what unlocks with a WWTA membership. Drives
  conversions back to the org.

These layer onto the architecture below — none requires a
foundational change beyond what's already proposed.

## Architecture changes

### Domain

New entity `Trail` in `src/domain/trail.ts`:

```ts
type TrailId =
  | 'cascadia-marine'
  | 'maritime-heritage'
  | 'lakes-to-locks'
  | 'ndwt'
  | 'willapa-bay'
  | 'kitsap-peninsula'
  | 'lower-columbia'
  | 'pend-oreille';

interface Trail {
  readonly id: TrailId;
  readonly slug: string;
  readonly name: string;
  readonly shortName: string;       // "Cascadia"
  readonly type: 'marine' | 'river' | 'lake' | 'mixed';
  readonly region: 'puget-sound' | 'columbia-snake' | 'coast'
    | 'king-county' | 'kitsap' | 'pend-oreille';
  readonly colorPalette: PandaColorPalette; // 'green' | 'sage' | 'blue' | …
  readonly bbox: readonly [number, number, number, number];
  readonly description: string;
  readonly partnerOrg?: string;     // "WWTA", "LCREP", …
  readonly externalUrls: {
    wwtaPage?: string;
    arcgisStoryMap?: string;
    pdfMap?: string;
    guidebook?: string;
  };
}
```

`Site` gains `readonly trailIds: readonly TrailId[]` (non-empty;
most sites have exactly one). `FacilitySet` extends with
marine-relevant flags that don't fit the river-trail dataset:
`mooringBuoys`, `kayakLaunch`, `paddlerOnly`,
`requiresReservation`, `tidalAccess`, `permitRequired`. The
existing nine flags stay; the new ones default to `undefined`
(unknown), not `false`.

### Application

`SiteRepository` port grows two methods, both pure:

```ts
listTrails(): Promise<readonly Trail[]>;
listSitesByTrail(trailId: TrailId): Promise<readonly Site[]>;
```

Existing `listSites()` and `getSite(slug)` stay unchanged.
Filter logic in `src/domain/site-filter.ts` learns about
`trailIds` so the index page can filter by trail.

### Adapters: inbound

`src/adapters/inbound/next/load-sites.ts` becomes
`load-trails.ts`. It reads a small manifest at
`public/data/trails/manifest.json` listing the eight trails,
then `Promise.all`s the per-trail GeoJSON loads. Sites with the
same coordinate fingerprint across multiple trail files are
deduplicated and the union of `trailIds` is preserved.

### Adapters: outbound (new)

Live-data adapters all sit behind ports so they're optional and
mockable. Each is a thin wrapper around a public API:

| Adapter | API | Use |
|---|---|---|
| `NoaaTideAdapter` | NOAA CO-OPS `/api/datagetter` | Nearest tide station forecast for marine sites |
| `NoaaCurrentAdapter` | NOAA CO-OPS currents | Slack / max ebb / max flood for Cascadia routes |
| `NwsWeatherAdapter` | NWS `/gridpoints/.../forecast` | Forecast at site coords |
| `UsgsWaterAdapter` | USGS Water Services | River gauge for Snake/Columbia/Pend Oreille |
| `WsdotFerryAdapter` | WSDOT Traveler API | Ferry sailings for Cascadia routes that use them |

These don't pre-bake. The data is per-request, and a static
export with hourly cache invalidation gives stale tides. A
small client component fetches on mount, shows a skeleton,
fails gracefully to "conditions unavailable."

#### Client-fetch vs. function-proxy

Live-data fetching splits along a single axis: **does the API
require a key or rate-limit aggressively?**

- **Keyless and CORS-friendly → client-side fetch.** NOAA
  CO-OPS, NWS, and USGS Water Services all publish
  `Access-Control-Allow-Origin: *` deliberately, expecting
  researchers and public dashboards to call them directly from
  browsers. We inherit their public-good caching and stay
  pure-static.
- **Keyed or rate-sensitive → Netlify Function proxy.**
  WSDOT's Traveler API needs a key (free, but issued per
  account); shipping it client-side leaks it to scrapers.
  We proxy through a small Netlify Function at
  `/api/wsdot-ferries`. The function holds the key as an env
  var, calls WSDOT, and returns the response with a 5-minute
  edge-cache header so 50 simultaneous users hit WSDOT once,
  not 50 times.

Why we don't drop `output: 'export'` to use Next.js Route
Handlers instead. The argument is real — Route Handlers would
fold the proxy into the same deploy pipeline, give us
Next.js's caching primitives, and flatten the architecture.
But it would also reverse a foundational decision in
[`docs/plans/modernization.md`](./modernization.md): the site
deploys as static files to any CDN, with zero runtime server,
zero cold starts, and zero hosting cost beyond Netlify's free
tier. That property is the load-bearing reason the nonprofit
operating-cost story works at all. **We keep static export
and use Netlify Functions as a narrow, additive escape hatch
for the small set of APIs that actually need server-side
mediation** — currently just WSDOT, plus the future-capability
agent-tool surface (see _Future capabilities_). Functions are
pay-per-invocation and add no operational state, preserving
the static-export property in spirit.

A new `MultiWaypointGpxAdapter` extends `site-to-gpx.ts` to
emit a GPX `<rte>` (route) with multiple `<rtept>` waypoints in
order, suitable for import into Garmin / Gaia / Avenza.

### Adapters: WordPress as the editorial CMS

WWTA's WordPress install is the natural CMS for trail editorial
content across all eight trails. The
[REST endpoint table in `gap-analysis-wwta.md`](../gap-analysis-wwta.md#api-access-to-wwtaorg)
already verified that `GET /wp-json/wp/v2/pages` is open for
public reads, no auth needed for body HTML.

Recommendation: **adopt Strategy B from `gap-analysis-wwta.md`
as the default**. A new inbound adapter at
`src/adapters/inbound/wordpress/load-trail-content.ts` hits
`/wp-json/wp/v2/pages?slug=<trail>-*` at build time and returns
typed `Page` records keyed by slug. The `app/<trail>/` route
trees render the fetched HTML inside `ArticleLayout` instead
of (or eventually replacing) MDX.

Benefits at the multi-trail scale that didn't apply at single-
trail scale:

- WWTA staff edit one place; the site rebuilds automatically
  on each publish.
- We don't author or maintain editorial for seven trails we
  aren't subject-matter experts on.
- The `map.wwta.org` subdomain framing makes "your CMS, our
  map" a natural division.

#### Publish-to-deploy latency

The trade-off in any build-time CMS pull is that an editor's
"Publish" click in WordPress doesn't show up on `map.wwta.org`
until the next build. Without a fix, that's a real source of
"my edits are broken" support tickets.

Plan: **wire WordPress's `save_post` action to a Netlify Build
Hook.** Build Hooks are unique URLs Netlify exposes per site;
hitting one triggers a fresh deploy. A small WP plugin (or the
existing "WP Webhooks" plugin) fires `POST <build-hook-url>`
when any page or post under the trail-relevant slugs is
saved. Latency from publish to live: roughly the build time
plus deploy-cache propagation — call it 3–5 minutes for our
project size.

A daily cron deploy runs alongside as a safety net, in case a
webhook is missed (e.g., WP plugin disabled, network blip).

Editor onboarding documents both the path and the expected
latency: "Press Publish; expect ~5 minutes before the change
is live on the map site. If it's not visible after 15
minutes, the daily rebuild will catch it; if it's still not
there tomorrow, file an issue."

Cost: build-pipeline coupling on the WordPress API. Mitigated
by adapter-level caching (write fetched HTML to a local JSON
shadow during build; rebuild only on webhook or daily cron)
and a graceful-degradation fallback that ships a "see this
trail on wwta.org" CTA if the fetch fails — better than a
broken build.

NDWT stays on MDX through Phase 14 cutover. The first
WordPress-driven trail in this plan should be Maritime Heritage
(Phase 17, smallest dataset) — it validates the adapter under
realistic load before we depend on it for Cascadia.

A small follow-on: a sister adapter
`src/adapters/inbound/wordpress/load-trail-photos.ts` that
queries the **NextGen Gallery** admin endpoint (Application
Password auth, env-var'd) for trail-tagged photos. That
endpoint is the one that needs WWTA admin coordination — see
`gap-analysis-wwta.md` for the credential setup flow.

### Composition root

`src/composition-root.ts` keeps its current shape but accepts
an optional `Trail[]` alongside `Site[]`. The `MapApp`
component reads trails to color-code and label layers; the
`/sites/` index reads them to render the trail filter dropdown.

### Map

The single green vector layer becomes one vector layer per
trail, with the Park UI Panda `colorPalette` token driving
marker color (Cascadia=blue, NDWT=green, Lower Columbia=teal,
Pend Oreille=indigo, Willapa=sage, Kitsap=cyan, Lakes-to-Locks
=violet, Maritime Heritage=amber). LayerSwitcher grows three
groups:

- **Trails** — eight toggleable per-trail vector layers
  (default: all on for the overview map; only the active trail
  on for trail landings).
- **Marine charts** — OpenSeaMap (already have) +
  **NOAA ENC raster tiles** (`tileservice.charts.noaa.gov`,
  XYZ, no key). Off by default; toggle on for marine trails.
- **Cultural overlays** — First Nations / Indigenous
  territories (Native Land Digital GeoJSON adapter; off by
  default; toggleable). Includes an attribution + acknowledge-
  ment line in the legend.

The current "click marker → open drawer" flow is unchanged —
the drawer header gains a trail badge for each trail the site
belongs to, plus a "Member detail on wwta.org" CTA where WWTA
has matching gated content.

## Routes

Net additions on top of today's tree:

```text
app/
  page.tsx                  # All-trails overview map (default-on layers)
  trails/
    page.tsx                # Trail index card grid
    [trailSlug]/
      page.tsx              # Trail landing: hero, map filtered, sites
      sites/page.tsx        # Trail-scoped site index
  sites/
    page.tsx                # Existing all-sites index, gains Trail filter
    [slug]/page.tsx         # Existing detail, gains Trail badges + conditions
  plan/
    page.tsx                # New: route builder, multi-waypoint GPX
  conditions/
    page.tsx                # New: tides + weather + river gauges hub
  about/                    # Existing
  water-safety/             # Existing
  …                         # Other editorial unchanged
```

`Header.tsx` `NAV_ITEMS` is reordered: **Map · Trails · Sites ·
Plan · Conditions · Safety · Navigation · About**, with the
existing "Get Involved" link pointing at wwta.org's
`/join-or-donate/`. Nine items still fits at xl breakpoint;
the hamburger handles base.

## Data: the long pole

The architecture is the easy part. The hard part is the
**data** for the seven non-NDWT trails. Counts and starting
points:

| Trail | Sites on wwta.org | Source format | Effort estimate |
|---|---|---|---|
| Cascadia Marine | 75 | HTML list, ArcGIS story map | High — digitize 75 entries with full facility metadata |
| Maritime Heritage | ~5 (pilot near Bainbridge) | HTML | Low — small dataset |
| Lakes-to-Locks | 0 listed | HTML narrative only | Medium — needs primary research with King County / Seattle Parks |
| NDWT | ~150 | Already have `ndwt.geojson` | Done |
| Willapa Bay | 12 | HTML list with amenity notes | Low — manual transcription |
| Kitsap Peninsula | TBD | HTML | Medium — verify count |
| Lower Columbia | TBD | LCREP partner data may exist | Medium — explore partner source |
| Pend Oreille | TBD | HTML | Medium — verify count |

Approach: digitize one trail per PR, in increasing site-count
order so the small ones land fast and we hit the architecture
edge cases (multi-trail sites, marine-specific facility flags)
before tackling Cascadia. Each digitization PR ships a single
new `public/data/trails/<slug>.geojson` and the smallest
`Trail` manifest entry that makes the trail render.

### ArcGIS data spike for Cascadia and other hosted layers

WWTA's Cascadia ArcGIS story map is almost certainly backed by
a hosted FeatureLayer on ArcGIS Online. If that layer is
published with public read access, we can pull GeoJSON straight
from it and skip the 75-site hand-transcription entirely. The
spike — half a day of work — is to identify the layer URL and
confirm:

1. Open the story map in the browser, find the embedded web
   map ID (a 32-char hex string in the URL or page source).
2. Hit `https://www.arcgis.com/sharing/rest/content/items/<id>?f=json`
   to get the web map JSON, which lists its operational layers.
3. Each operational layer points at a FeatureService URL like
   `https://services.arcgis.com/<org>/arcgis/rest/services/<name>/FeatureServer/0`.
4. Confirm public read with
   `…/FeatureServer/0?f=json` — if the response includes
   capabilities and field metadata without auth, we're in.
5. Pull GeoJSON in one shot:
   `…/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson`.

If steps 4–5 work, we add a one-shot import script at
`scripts/import-cascadia-from-arcgis.ts` that an engineer runs
locally, normalizes ArcGIS field names into our `Site` shape,
and writes `public/data/trails/cascadia-marine.geojson` as a
**checked-in snapshot**. We commit the result alongside any
hand-edits — same source-of-truth treatment as every other
trail. To pick up upstream WWTA edits later, an engineer
re-runs the script and reviews the diff in a PR. We do
**not** wire this as a build-time fetch — that would couple
our deploys to ArcGIS Online's availability and make every
deploy an unreviewed data merge. Same script generalizes if
WWTA publishes other trails as FeatureLayers.

If the layer is **not** public, the fallback is to ask WWTA's
ArcGIS Online admin to share it publicly (one toggle in the
ArcGIS Online item settings) — much cheaper than an
authenticated ArcGIS Online OAuth flow on this side.

If neither works, we hand-transcribe; the table above assumes
that worst case for Cascadia's effort estimate.

## Phased implementation

Per `CLAUDE.md`, **one PR per phase**. Each phase is a
shippable, lint-clean, tests-green increment.

| Phase | Description | State |
|---|---|---|
| 15 | `Trail` entity + repository extension; NDWT migrated to `public/data/trails/ndwt.geojson`; no UI change | Proposed |
| 15a | **Spike**: ArcGIS FeatureLayer reachability for Cascadia (& any other WWTA hosted layer) — half-day, no PR if negative | Proposed |
| 15b | **Spike**: WordPress REST adapter shape — typed `Page` fetch + ArticleLayout render of one wwta.org page | Proposed |
| 15c | **Coordination**: pitch `map.wwta.org` subdomain + DNS to WWTA board | Proposed |
| 16 | `/trails/` index + per-trail landing routes; map gains per-trail layers (NDWT only at first) | Proposed |
| 17 | Digitize Maritime Heritage (~5 sites) via WP REST adapter — first non-NDWT trail; validates both data path and CMS path | Proposed |
| 18 | Digitize Willapa Bay (12 sites); marine facility flags exercised | Proposed |
| 19 | Digitize Kitsap Peninsula | Proposed |
| 20 | Digitize Lower Columbia (LCREP data spike first) | Proposed |
| 21 | Digitize Pend Oreille | Proposed |
| 22 | Digitize Lakes-to-Locks (primary research) | Proposed |
| 23 | Digitize Cascadia Marine — ArcGIS adapter if 15a was positive, otherwise hand-transcribe (75 sites; biggest PR) | Proposed |
| 24 | NOAA tide + NWS weather adapter; per-site conditions card | Proposed |
| 25 | USGS river gauge adapter for river trails | Proposed |
| 26 | Multi-waypoint GPX + `/plan/` route builder | Proposed |
| 27 | `/conditions/` hub: at-a-glance for all monitored stations | Proposed |
| 28 | NOAA ENC marine charts overlay layer | Proposed |
| 29 | First Nations territories overlay (Native Land Digital adapter) — gated on WWTA Tribal Communities advisory review | Proposed |
| 30 | Hazards as a `Site.kind` plus a hand-curated hazards seed dataset | Proposed |
| 31 | NextGen Gallery photo adapter (Application Password auth) — trail-tagged photos on site detail | Proposed |
| 32 | `/about/membership/` public-vs-member feature comparison page; "Member detail on wwta.org" CTA in site drawer | Proposed |

Phase 15 is the only phase that's pure refactor — landing it
unlocks every later phase without UI risk. The three **15x
spikes** can run in parallel: each is a half-day investigation
that either de-risks or kills a downstream phase. Phases 17–23
are data-shaped; the architecture work is done in 15–16.

## Constraints worth flagging

- **Static export**. `next.config.mjs` keeps
  `output: 'export'`, so all build-time data (GeoJSON,
  optional WP pulls) is fine, but **live data must be
  client-fetched**. NOAA / NWS / USGS all support CORS-friendly
  read endpoints; verify each before committing to it.
- **Bundle size**. Eight trails × ~50 sites average means
  ~400 sites client-side. Today's 150 sites in one GeoJSON is
  ~145 KB; the projected dataset is ~400 KB compressed.
  Acceptable, but the `/sites/` index should already
  virtualize the list (it doesn't yet — file as a Phase 16
  follow-up if perf shows).
- **PandaCSS color palette tokens**. Eight colors means we lean
  on Park UI's preset palette (green, sage, blue, teal, indigo,
  violet, cyan, amber). No new custom palette tokens unless one
  trail has a brand color that doesn't fit. `panda.config.ts`
  changes are gated per `CLAUDE.md` ("touching `panda.config.ts`
  Park UI preset" → stop and ask).
- **Data licensing**. Anything we redistribute as GeoJSON needs
  the upstream source documented in `sourceUrl` per site. WWTA
  HTML pages are likely usable with attribution; LCREP / WSDOT
  / state-parks data each has its own terms — verify per
  source.
- **API rate limits and key handling**. NOAA CO-OPS has no
  documented hard limit but asks for a `User-Agent`
  identifying the app. NWS requires a `User-Agent`. Both
  publish CORS headers for public-research use and are called
  client-side. **WSDOT Traveler API needs a key** — that one
  goes through a Netlify Function proxy at `/api/wsdot-ferries`
  with the key as an env var and a 5-minute edge cache, per
  _Client-fetch vs. function-proxy_ above. All adapters hide
  behind feature flags so a missing key or upstream outage
  degrades to "conditions unavailable" rather than a 401.

## Decisions to make before kickoff

1. **Domain: `map.wwta.org` subdomain.** Recommended path —
   keeps brand authority with WWTA, avoids the "what do we
   name a multi-trail hub" question, and frames the
   "your CMS, our map" division naturally. WWTA board sign-off
   and a DNS CNAME to Netlify is the only ask. Falls back to a
   neutral domain (`pnwwatertrails.org` etc.) only if WWTA
   declines the subdomain.
2. **WordPress as the editorial CMS for trail content.**
   Recommended path — WWTA staff edit one place, we pull at
   build time via the public WP REST API (no auth needed for
   page content). Confirm with WWTA editors that they're
   willing to be the editorial source of truth across all
   eight trails, and confirm an editorial naming convention
   for slugs (`<trail>-overview`, `<trail>-safety`, etc.) so
   our adapter has a stable contract.
3. **ArcGIS as a one-time data import, not a foundation.**
   Decision already made: the runtime stack is open-source
   (OpenLayers + OSM + open public data feeds). Phase 15a's
   ArcGIS spike is a one-shot GeoJSON pull, not an integration.
   If WWTA's Cascadia layer is public-read on ArcGIS Online,
   we snapshot it and move on. If it's private, ask WWTA's
   ArcGIS Online admin to flip the share-with-everyone toggle
   on the item. Failing both, hand-transcribe. **No phase in
   this plan introduces a runtime dependency on Esri or any
   other proprietary mapping stack.**
4. **Retire WWTA's ArcGIS Cascadia story map?** Once we ship a
   vector Cascadia layer at `map.wwta.org`, two canonical maps
   is confusing. Pitch WWTA on retiring the ArcGIS story map
   (or reframing it as a narrative-only tour that doesn't try
   to double as the data source). Same conversation for any
   other ArcGIS-hosted maps WWTA has lying around.
5. **First Nations territories overlay scope.** Adding a
   tribal-territories layer is high-value and politically
   sensitive. Decision needed on (a) data source — Native
   Land Digital is the obvious choice but is community-curated
   and contested in spots, vs. state DNR data which is
   official-recognized-only and incomplete; (b) whether to
   solicit per-nation review of the layer copy and presentation
   before going live. Default plan: ship as a toggleable
   (default-off) overlay sourced from Native Land Digital with
   clear attribution, after WWTA's NDWT Tribal Communities
   advisory contacts have reviewed.
6. **NextGen Gallery Application Password.** The photo adapter
   in Phase 28 needs WWTA-side admin coordination to issue an
   Application Password for the build environment, per the
   credential-setup flow in `gap-analysis-wwta.md`. WWTA admin
   action; one-time.
7. **Trail data partnerships.** LCREP for Lower Columbia,
   Kitsap Peninsula tourism for Kitsap, King County Parks for
   Lakes-to-Locks. Each is a phone call WWTA staff are better
   placed to make than we are.
8. **Member-gated content?** WWTA's print guidebook is members-
   only. If we eventually surface a "view guidebook content for
   this site" section, we need WWTA's auth model on this side
   — almost certainly **not worth it**. Decision: no member
   content lives on this site, ever; gated content stays
   exclusively on wwta.org. The "Member detail on wwta.org"
   CTA in the site drawer is the boundary — we show the
   doorbell, never the doorway.

## Future capabilities (beyond Phase 32)

Sketches of three capability families that have come up as
"would this need a spatial database / different stack?"
questions. Recording them here so the architecture decisions
above don't have to be relitigated when the time comes. **None
of these is committed to the phase plan; each is a candidate
for a separate planning doc when prioritized.**

> **Discipline check.** These are exciting engineering
> problems and that's exactly why they're a distraction risk.
> The core mission is getting eight trails' worth of basic
> data digitized and live on `map.wwta.org`. **No work on
> any future capability begins until Phase 32 is in
> production**, and even then only if a real user need has
> been articulated by WWTA or paddlers — not because the
> graph-routing problem is fun to think about. If we find
> ourselves prototyping a routing engine before Cascadia is
> digitized, we've lost the plot.

The pattern across all three: **spatial work happens at build
time, queryable artifacts ship as JSON, runtime stays spatial-
free.** PostGIS earns its keep when scale or concurrency
forces work to the server (see _When would we adopt PostGIS?_
above) — none of the capabilities below trips that bar at
PNW-eight-trails scale.

### Camp-to-camp routing

User story: a paddler picks two sites and asks "what's the
realistic on-water route between them, and how long?" Cascadia
paddlers want this most — Puget Sound is full of islands and
straits where the great-circle distance is misleading.

The hard part is the **navigable-water graph**, not the
routing engine. Sketch:

- Build a graph of nodes (sites + intermediate channel
  waypoints) and edges (navigable segments with distance,
  bearing, and bottleneck notes) per trail.
- Source candidates: hand-digitize over OpenStreetMap's
  `natural=coastline` and `natural=water` polygons; or extract
  from NOAA charts; or seed from the Cascadia Marine Trail
  guidebook's recommended routes and extend.
- Commit the graph as JSON alongside the GeoJSON, ~few hundred
  KB per trail.

Routing engine: any in-process JS graph library (`ngraph.path`,
`graphology-shortest-path`, `cytoscape`). Dijkstra for fastest;
A\* with a sea-distance heuristic for big graphs. All runs
client-side; no server, no database.

The PostGIS + pgRouting alternative is cleaner code but only
pays off at continental scale or with thousands of nodes. At
~100–200 nodes per trail it would be using a database to do
graph search on a graph that fits in a JSON file.

Phase shape if pursued: graph data first (one PR per trail),
then a `<RoutePlanner>` component that drops on `/plan/`.

### Wind-and-tide-aware day-of-travel feasibility

User story: "I want to leave Sand Island Saturday morning and
get to Couse Creek by Sunday evening — is that realistic given
the forecast, and when should I leave each day?"

Decomposed:

- **Build-time spatial precomputation.** For each site, find
  the nearest NOAA tide station, nearest NOAA currents
  station, and NWS gridpoint forecast cell. Cache the IDs on
  the site record. `turf.nearestPoint` or a 30-line Node
  script — no PostGIS needed for 400 points.
- **Runtime live data fetch.** NOAA CO-OPS for tide / current
  predictions, NWS gridpoint forecast for wind and weather.
  Already in the plan as Phase 24–25.
- **Numerical integration in the browser.** Walk the route
  segment by segment, project the current vector along the
  segment bearing, subtract a wind-resistance factor (cosine
  model is good enough), apply the paddler's input pace,
  integrate to get arrival time at each waypoint. ~30 lines of
  JS per segment; full route runs in milliseconds.
- **Output.** "Leave Sand Island at 06:30 to catch the ebb
  through the lock; arrive Lyons Ferry at 14:00 with 1.2 kts
  of current help; total day 18nm at 3.4 kts effective." Plus
  a calendar widget showing tide windows along the route.

This is interesting work but mostly modeling, not data
infrastructure. PostGIS doesn't appear in any version that
makes sense at this scale.

The one place server-side compute helps: **interactive
replanning** — user drags a "departure time" slider and the
route reflows live. The math budget per slider tick is
manageable client-side for short routes (one paddler-day) but
gets choppy for multi-day itineraries with many tide cycles.
The right fix there is a small Netlify Function or Cloudflare
Worker holding the graph and the math in memory — still no
database, just compute-as-a-service.

### AI / agentic query surface

User story: "Find me a sheltered camp within 10 nautical miles
of where I am right now, with fresh water and no fee, that's
on Coast Salish ancestral waters." Either a chatbot in the
sidebar or a Claude / ChatGPT plugin / MCP server.

The pattern that matters is **a typed query surface** the
agent can call:

```ts
findSites(args: {
  near?: { lat: number; lng: number; radiusNm: number };
  facilities?: Array<keyof FacilitySet>;
  trails?: TrailId[];
  ownership?: 'state-park' | 'county' | 'federal' | 'tribal' | 'private';
  freeOnly?: boolean;
}): Promise<Site[]>;

routeBetween(args: {
  from: SiteId;
  to: SiteId;
  paddlerKnots: number;
  departAt: ISODateTime;
}): Promise<Route>;

dayFeasibility(args: {
  route: Route;
  paddlerKnots: number;
  departAt: ISODateTime;
}): Promise<{ ok: boolean; arrivals: Arrival[]; warnings: string[] }>;
```

At 400 sites these tools run in-process over the in-memory
GeoJSON in tens of milliseconds. The whole surface lives in
`src/application/agent-tools/` as pure functions over the
existing repository port; an MCP server or Netlify Function
exposes them to whichever agent is calling.

Where this would push toward a different stack:

- **pgvector for semantic search.** "Find a site that feels
  like the Klickitat trip from this 2023 blog post." Embed
  every site description + every blog post; cosine-similarity
  query the embedding store. pgvector is a Postgres extension
  but doesn't strictly need PostGIS. Could also be served
  from `sqlite-vec` (no server) or a static FAISS index
  shipped as a build artifact (no server, no DB).
- **Server-side spatial joins across territories layer + sites
  layer.** "Sites near places where the Yakama Nation has
  traditional fishing access." Doable with PostGIS in one
  query; doable with `turf.booleanPointInPolygon` in a
  build-time precomputation that adds a `nations: TerritoryId[]`
  field to each site. Build-time wins.

Phase shape if pursued: define the agent-tool TypeScript
contract first, ship a Netlify Function exposing the tools,
then either a sidebar chat UI on the site or an MCP server
config doc for users to point Claude / ChatGPT at directly.

## Out of scope

For clarity about what this plan **does not** propose:

- **No CMS on this side.** The site stays a static export.
  Editorial content lives in WWTA's WordPress and is pulled at
  build time via the public REST API; trail GeoJSON ships
  through PRs as today. We don't run a CMS, an admin UI, or a
  database here.
- **No user accounts on this site**. Saved trips, favorites,
  trip reports — all stay on wwta.org if they exist at all.
- **No reservations**. Cascadia's reservations stay on
  wwta.org. We can deep-link to a site's reservation page from
  the site detail panel, but the booking flow is theirs.
- **No mobile app**. The PWA story for the static export is
  good enough; native apps are a different funded project.
- **No real-time site-condition reporting**. Site stewards
  report conditions to WWTA; if WWTA exposes that as data we
  can render it, but we don't build the reporting UI.

## Why this is worth doing

The current site is a polished interactive map for one trail
out of eight. Every architectural decision in
`docs/plans/modernization.md` and `docs/plans/feature-parity.md`
already generalizes — `Trail` is the entity that's missing,
not a refactor. Shipping it gives WWTA's seven other trails a
real interactive map without each needing its own one-off
ArcGIS or Google Maps embed, and centralizes the
boating-access dataset for the region in one place that's
free to host, fast to load, and open for third-party reuse.

The boundary with wwta.org stays clean: WWTA the org runs
membership, fundraising, events, photos, podcast. This site
runs the map.
