# Gap analysis: this site vs. wwta.org

A snapshot of where this site (an interactive map + canonical
trail dataset for the Northwest Discovery Water Trail) and
[wwta.org](https://www.wwta.org) (the Washington Water Trails
Association's WordPress org-wide site, which is the management
home for eight water trails) overlap and diverge.

This is **distinct from** [`gap-analysis.md`](./gap-analysis.md):
that document compares this site against **ndwt.org** (the
legacy ASP site we plan to replace in Phase 14). This document
compares this site against **wwta.org**, which we coexist with
rather than replace. The two analyses inform different
decisions:

- _vs. ndwt.org_: what content / features must we ship before
  the cutover.
- _vs. wwta.org_: where is the boundary between "owned by this
  site" and "owned by WWTA", and what should we integrate vs.
  link out to.

## How wwta.org is organized

WWTA's WordPress installation manages **eight water trails**:

- Cascadia Marine Trail (the main one; has reservations,
  stewards, FAQ, guidebook updates)
- Northwest Discovery Water Trail
- Lower Columbia River Water Trail
- Willapa Bay Water Trail
- Lakes-To-Locks Water Trail
- Maritime Heritage Trail (newest; July 2025 launch)
- Pend Oreille River Water Trail
- Kitsap Peninsula Water Trail

For NDWT specifically, WWTA has ported **every editorial page
from ndwt.org** into WordPress under `ndwt-*` slugs:

| WordPress slug | Page title |
| --- | --- |
| `ndwt-home` | Map Your Trip on the Water Trail |
| `ndwt-explore-the-water-trail` | Explore the Northwest Discovery Water Trail |
| `ndwt-site-information` | The Northwest Discovery Water Trail |
| `ndwt-water-safety` | Water Safety (index) |
| `ndwt-weather` / `-barge-traffic` / `-communications` / `-reading-the-rivers` / `-float-plans` / `-safety-gear` | Six water-safety sub-pages |
| `ndwt-river-navigation` / `-lock-and-dam-protocol` / `-portage-guide` | River-navigation index + 2 sub-pages |
| `ndwt-natural-world` / `-flora-and-fauna` / `-geology` / `-invasive-species` | Natural-world index + 3 sub-pages |
| `ndwt-past-and-present` / `-tribal-communities` / `-early-explorers` / `-trade-and-industry` | Past-and-present index + 3 sub-pages |
| `ndwt-leave-no-trace` | Leave No Trace |
| `ndwt-about-the-water-trail` / `-history` / `-partners` / `-contact` / `-press-coverage` | About + sub-pages |
| `ndwt-donate` / `-volunteer` / `-trip-reports` / `-get-involved` | Get-involved cluster |
| `ndwt-photo-gallery` | Photo Gallery (NextGen Gallery plugin) |
| `ndwt-links` | External links |

Three NDWT pages exist on WWTA that aren't yet on this site:

- **`northwest-discovery-trail-historical-access`** — historical
  river access narrative.
- **`northwest-discovery-trail-waterway-of-yesterday`** —
  retrospective on the corridor's working-river era.
- **`northwest-discovery-trail-recognition`** — designation /
  recognition record.

## Sitemap comparison (NDWT scope only)

| Section | This site | wwta.org | Notes |
| --- | --- | --- | --- |
| Interactive map of ~150 sites | ✅ Have | ❌ None | This site's defining feature. |
| Per-site detail pages (slugs) | ✅ Have | ❌ None | 159 pages at `/sites/<slug>/`. |
| Site index / browse-by-list | ✅ Have | ❌ None | `/sites/` with filter + sort. |
| GPX waypoint download per site | ✅ Have | ❌ None | |
| Static GeoJSON dataset published | ✅ Have | ❌ None | `/data/ndwt.geojson`. |
| Water Safety (6 sub-pages) | ✅ Have | ✅ Have | Same content origin (ndwt.org → both). Slight wording differences. |
| River Navigation (2 sub-pages) | ✅ Have | ✅ Have | Same. |
| Leave No Trace | ✅ Have | ✅ Have | Same. |
| Natural World (3 sub-pages) | ✅ Have | ✅ Have | Same. |
| Past & Present (3 sub-pages) | ✅ Have | ✅ Have | Tribal Communities flagged for WWTA review on our side. |
| About: history, partners | ✅ Have | ✅ Have | Same. |
| About: contact | ✅ Have (mailto) | ✅ Have | We point at `info@wwta.org`. |
| About: photo gallery | ✅ Stub linking out | ✅ Have (NextGen Gallery, ~544 media items) | Our `/about/photo-gallery/` currently links to wwta.org root; placeholder URL to be confirmed. |
| Get Involved: donate / volunteer / trip reports | ✅ Stub linking out | ✅ Have | Three CTAs on our `/get-involved/`; URLs are placeholders pointing at wwta.org root. |
| Historical Access page | ❌ Missing | ✅ Have | NDWT-specific, never on ndwt.org. |
| Waterway of Yesterday | ❌ Missing | ✅ Have | NDWT-specific. |
| Recognition / designation page | ❌ Missing | ✅ Have | NDWT-specific. |
| Press Coverage | ❌ Deferred (per `gap-analysis.md`) | ✅ Have | We chose to defer permanently. |
| Membership / join | ❌ N/A | ✅ Have | WWTA-org concern; link out only. |
| Shop / merchandise | ❌ N/A | ✅ Have | WWTA-org concern; link out only. |
| Calendar of events | ❌ N/A | ✅ Have (`tribe/events`) | WWTA-org concern; link out only. |
| Blog / news (eNews) | ❌ Missing | ✅ Have (~10 NDWT-relevant posts) | Worth linking to selected NDWT-relevant posts. |
| Podcast | ❌ N/A | ✅ Have | WWTA-org concern. |
| Reservations system | ❌ N/A | ✅ Have (Cascadia trail only) | Not relevant to NDWT. |
| Site Stewards program | ❌ N/A | ✅ Have (Cascadia trail only) | Not relevant to NDWT. |

## Capabilities each side has that the other doesn't

### This site's strengths

1. **Interactive OpenLayers map** with click-to-open info panel.
2. **Per-site canonical URLs** (`/sites/<slug>/`) that are
   shareable, indexable, printable.
3. **Sortable / filterable site index** by name, river, and
   facility.
4. **Static GeoJSON dataset** published for third-party reuse.
5. **GPX waypoint download** per site.
6. **Print-friendly site detail pages**.
7. **Static export, CDN-served** — fast, no cold starts, free
   to host.
8. **Modern accessibility** — keyboard navigation, screen-reader
   labels, dark mode, mobile-responsive nav.

### wwta.org's strengths (NDWT-relevant)

1. **CMS workflow for non-technical editors**. WWTA staff can
   update pages via WordPress admin without a deploy.
2. **Photo library** — NextGen Gallery with ~544 media items
   total, several albums for NDWT.
3. **Membership + donations + shop**. Already wired up to
   payment processing.
4. **Calendar of events**. The Events Calendar (Tribe) plugin
   handles upcoming-events display, RSVPs, recurring schedules.
5. **Multi-trail context**. A user looking at NDWT can discover
   the other seven trails WWTA manages.
6. **Three NDWT pages we don't have**: Historical Access,
   Waterway of Yesterday, Recognition.
7. **Active blog**: NDWT-relevant posts like "Paddling the
   Northwest Discovery Trail from Pink House to Lippy" (Jan
   2023), trip reports.

## Recommended boundary

**This site owns** the data + map + per-site detail surfaces.
That's where our static-export speed + interactive UX make the
biggest difference, and the data is ours to maintain.

**WWTA owns** the org-wide member-facing flows: donate,
membership, shop, events calendar, photo library, podcast.
We link out, never reimplement.

**Editorial content (Water Safety, River Navigation, etc.) is
the gray zone.** Three viable strategies, in order of
escalating effort:

### Strategy A: Independent copies (current state)

Both sites carry the editorial content. We maintain ours from
the ndwt.org scrape; WWTA maintains theirs in WordPress. Drift
is inevitable.

- **Pro**: simple, no integration cost.
- **Con**: when WWTA updates a page, we don't see it. Reverse
  too. Two sources of truth.

### Strategy B: Build-time pull from WWTA

A new inbound adapter under `src/adapters/inbound/wordpress/`
hits the WordPress REST API at build time and fetches the body
HTML for each `ndwt-*` page. Our `app/water-safety/` etc. routes
render the fetched HTML inside `ArticleLayout` instead of MDX.

- **Pro**: WWTA stays the editorial source of truth. Updates
  propagate on the next build (could be Netlify-cron-triggered
  for daily refresh). Same hex-arch shape as the GeoJSON
  loader.
- **Con**: requires every editorial change to ship through the
  build pipeline. Loses MDX's React-component embedding (e.g.
  PandaCSS-styled callouts).
- **Recommendation**: ship after Phase 14 cutover when this
  site is established; until then keep the static MDX.

### Strategy C: Single source of truth on WWTA

Drop our editorial pages entirely; redirect `/water-safety/`
etc. to the matching `wwta.org/ndwt-water-safety/` page.

- **Pro**: zero duplication.
- **Con**: leaves the site map. User clicks "Safety" in our
  nav and bounces to wwta.org's design system; jarring.
  Defeats the page-speed advantage that made this rebuild
  worthwhile.

**My pick**: A → B post-cutover. Keep editorial as static MDX
through Phase 14, then add the WordPress adapter as a Phase 15
or beyond.

## Photo integration (covered in `photo-candidates.md`)

WWTA's NextGen Gallery is referenced from our
`/about/photo-gallery/` page as a placeholder link. The
[`docs/plans/photo-candidates.md`](./plans/photo-candidates.md)
plan covers integrating those photos as candidates per site —
needs API access (see below).

## Three missing pages worth porting

These three pages exist on WWTA's NDWT section but aren't on
the legacy ndwt.org we scraped from:

- `/past-and-present/historical-access/` — narrative history of
  river access points.
- `/past-and-present/waterway-of-yesterday/` — retrospective on
  the corridor's commercial-river era.
- `/past-and-present/recognition/` — designation timeline (2005
  events are already in our `/about/history/`, but Recognition
  may have additional context).

These would be a small follow-up: scrape the three pages,
convert to MDX, add to the `app/past-and-present/[[...slug]]/`
catch-all PAGES map. ~30 minutes of work; could go in any
upcoming PR.

## API access to wwta.org

The WordPress REST API is **already open for public read** on
the public-facing content. Key endpoints I've verified:

| Endpoint | Auth | Notes |
| --- | --- | --- |
| `GET /wp-json/wp/v2/pages?per_page=100` | None | All public pages with title, slug, content. |
| `GET /wp-json/wp/v2/posts` | None | Blog posts, ~10 NDWT-relevant. |
| `GET /wp-json/wp/v2/media?per_page=100` | None | All 544 media items in the library. |
| `GET /wp-json/tribe/events/v1/events` | None | Events Calendar entries. |
| `GET /wp-json/wp/v2/categories` | None | eNews + others. |
| `GET /wp-json/ngg/v1/admin/attach_to_post/galleries` | **Application password** | NextGen Gallery list (admin route). |
| `GET /wp-json/ngg/v1/admin/attach_to_post/images` | **Application password** | NextGen Gallery image metadata. |

For everything we need today (gap analysis, content survey,
build-time editorial pulls in Strategy B above), the public API
is enough.

For the **NextGen Gallery** integration referenced in the
photo-candidates plan, we need authenticated access to the
admin namespace. WordPress 5.6+ has a clean way to do that via
**Application Passwords** — no plugin needed, no new user, no
shared real password.

### How to enable Application Passwords for this scraper

You're listed as the WordPress admin (per the Phase 13 plan
answers). On wwta.org:

1. Sign in to WordPress admin.
2. **Users → Profile** (or "Edit Profile").
3. Scroll to the **Application Passwords** section near the
   bottom.
4. Under "Application Name", enter something descriptive —
   e.g. `ndwt-ol-chakra build scraper`.
5. Click **Add New Application Password**.
6. WordPress shows a 24-character password **once**. Copy it
   immediately — closing the panel hides it forever.

That gives a string like `xxxx xxxx xxxx xxxx xxxx xxxx`
(spaces are decorative; can be removed). Pair it with your
admin **username** and the scraper authenticates with HTTP
Basic auth:

```sh
export WWTA_WP_USER='ivan'
export WWTA_WP_APP_PASSWORD='xxxxxxxxxxxxxxxxxxxxxxxx'
curl -u "$WWTA_WP_USER:$WWTA_WP_APP_PASSWORD" \
  'https://www.wwta.org/wp-json/ngg/v1/admin/attach_to_post/galleries'
```

The credentials are scoped to API access only — they can't log
in as you in the WordPress admin UI, and they can be revoked
from the same Profile page at any time without changing your
real password.

If the photo-candidate scraper picks up WWTA gallery support
later, it'll read `WWTA_WP_USER` + `WWTA_WP_APP_PASSWORD` from
the environment the same way Flickr would read
`FLICKR_API_KEY`. Both env vars are flagged as TODO comments in
[`scripts/find-photos.py`](../scripts/find-photos.py).

### Alternative: a custom plugin endpoint

If Application Passwords end up being awkward (e.g. you don't
want a script holding admin-level creds, even API-scoped), a
small WWTA-side WordPress plugin could expose a **public**
read-only endpoint at something like
`/wp-json/wwta/v1/ndwt-photos` that returns just the
NDWT-relevant gallery images with explicit license metadata.
That's WWTA developer work though, not something we can ship
from this repo.

For first-pass integration, Application Passwords is the right
trade-off.
