# Gap analysis: this site vs. ndwt.org

A snapshot of what the original
[ndwt.org](http://www.ndwt.org) offers that this site doesn't yet,
what this site offers that ndwt.org doesn't, and a recommended
priority for closing the gaps.

The original ndwt.org is itself in transition — its homepage notes
that the site is moving to the
[Washington Water Trails Association](https://www.wwta.org)
(WWTA) main site. Several gaps below should be planned against
WWTA's eventual hosting / database / ArcGIS layers rather than
recreating ndwt.org's legacy site artifacts as-is.

## Sitemap comparison

### ndwt.org top-level navigation

- **Home** — short tagline, hero image, CTA into the map tool.
- **Explore the Water Trail**
  - Site Information (the map tool + ~150 site detail pages)
  - Links (external resources)
  - Leave No Trace (best practices content)
- **Water Safety**
  - Weather
  - Barge Traffic
  - Communications
  - Reading the Rivers
  - Float Plans
  - Safety Gear
- **River Navigation**
  - Lock & Dam Protocol
  - Portage Guide
- **Natural World**
  - Flora & Fauna
  - Geology
  - Invasive Species
- **Past and Present**
  - Tribal Communities
  - Early Explorers
  - Trade & Industry
- **About the Water Trail**
  - Partners
  - Contact
  - History
  - Press Coverage
  - Photo Gallery
- **Get Involved**
  - Volunteer
  - Donate
  - Trip Reports
- Side-bar items: Traveler's Forum, "Map Your Trip on the Water
  Trail" promo, funding/management attribution.

### This site's current sitemap (after Phase 6)

- **Map** (`/`) — header + hero + interactive map + info panel.
- **About** (`/about/`) — single page with the Water Trail intro
  and a short note on the rebuild.
- **Trip Planning** (`/trip-planning/`) — how to use the map +
  GPX flow + a roadmap pointer.

### Top-level nav gap

| ndwt.org section                           | Status here | Notes                                                                                  |
| ------------------------------------------ | ----------- | -------------------------------------------------------------------------------------- |
| Home                                       | ✅ Have     | Map page is the home.                                                                  |
| Explore the Water Trail / Site Information | ⚠️ Partial  | Have the interactive map; missing one-page-per-site URLs and the printable site sheet. |
| Explore / Links                            | ❌ Missing  | Curated outbound links (river gauges, regs).                                           |
| Explore / Leave No Trace                   | ❌ Missing  | Short content page.                                                                    |
| Water Safety (entire section)              | ❌ Missing  | 6 sub-pages of safety content.                                                         |
| River Navigation (Lock & Dam, Portage)     | ❌ Missing  | Operational content boaters actually need.                                             |
| Natural World                              | ❌ Missing  | 3 short content pages.                                                                 |
| Past and Present                           | ❌ Missing  | 3 short content pages, culturally important.                                           |
| About / Partners                           | ❌ Missing  | Funding + WWTA + USACE + tribal partners.                                              |
| About / Contact                            | ❌ Missing  | Contact form / mailto.                                                                 |
| About / History                            | ❌ Missing  | Project history.                                                                       |
| About / Press Coverage                     | ❌ Missing  | Probably the lowest-value port.                                                        |
| About / Photo Gallery                      | ❌ Missing  | Could be a real differentiator.                                                        |
| Get Involved / Volunteer                   | ❌ Missing  | Volunteer signup / link to WWTA.                                                       |
| Get Involved / Donate                      | ❌ Missing  | Probably link out to WWTA donation page.                                               |
| Get Involved / Trip Reports                | ❌ Missing  | User-generated content; community feature.                                             |
| Traveler's Forum                           | ❌ Missing  | Community forum, almost certainly an integration with whatever WWTA runs.              |

## Site-detail field parity

The original site's per-site detail page (e.g.
`http://www.ndwt.org/ndwt/explore/site.asp?site=130` for Blalock
Canyon) shows:

| Field                 | ndwt.org                       | This site (panel)                                                            |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Site name             | ✅ "Blalock Canyon"            | ❌ Sites have no display name yet — header reads "Columbia River — Mile 234" |
| River segment         | ✅                             | ✅                                                                           |
| River name            | ✅                             | ✅                                                                           |
| River mile            | ✅                             | ✅                                                                           |
| Bank                  | ✅ "OR"                        | ✅                                                                           |
| Latitude / Longitude  | ✅                             | ✅                                                                           |
| State                 | ✅ (often blank in the source) | ❌                                                                           |
| County                | ✅ (often blank in the source) | ❌                                                                           |
| Season                | ✅                             | ✅                                                                           |
| Restrooms             | ✅                             | ✅                                                                           |
| Potable Water         | ✅                             | ✅                                                                           |
| Marine Dump Station   | ✅                             | ✅                                                                           |
| Day Use Only          | ✅                             | ✅                                                                           |
| Picnic Shelters       | ✅                             | ✅                                                                           |
| Boat Ramp             | ✅                             | ✅                                                                           |
| Hand-Carried Launch   | ✅                             | ✅                                                                           |
| Marina                | ✅                             | ✅                                                                           |
| ADA Access            | ✅                             | ✅                                                                           |
| Camping yes/no        | ✅                             | ✅                                                                           |
| Camping Fee           | ✅                             | ❌                                                                           |
| Contact               | ✅                             | ✅                                                                           |
| Phone                 | ✅                             | ✅                                                                           |
| Website               | ✅                             | ✅                                                                           |
| Notes                 | ✅                             | ❌                                                                           |
| Free-form description | ❌                             | ❌                                                                           |
| Photo(s)              | ❌ on most sites               | ❌                                                                           |
| GPX waypoint download | ❌                             | ✅                                                                           |

We're missing **Site name**, **State**, **County**, **Camping Fee**,
**Notes** from the source data. They're in the GeoJSON properties
but aren't surfaced in the panel.

## Capabilities the original site has that we don't

1. **Per-site canonical URLs.** Every site has its own page at
   `ndwt.org/ndwt/explore/site.asp?site=<id>`, which is shareable,
   bookmarkable, and indexed by search engines. Our panel state
   isn't reflected in the URL — sharing a site requires sharing the
   homepage and saying "click marker N."
2. **Site index / browse-by-list.** Their explore page is also a
   list, sortable by river. Our app has only the map view.
3. **Printable site sheet.** Their page lays out cleanly when
   printed — useful for trip-day handouts.
4. **Static long-form content** for the Water Safety, River
   Navigation, Natural World, and Past-and-Present sections — the
   editorial value the trail organization provides above-and-beyond
   the marker dataset.
5. **Photo gallery.**
6. **Trip Reports** (user-generated content).
7. **Donate / Volunteer / Contact** flows.

## Capabilities this site has that the original doesn't

1. **Modern, mobile-friendly, accessible UI.** Original uses a
   legacy fixed-width layout with ~600px-min map, fixed widths, no
   mobile handling.
2. **Interactive map with hover / click affordances.** Original
   uses a static map image and per-site links; ours pans, zooms,
   and surfaces info inline.
3. **GPX waypoint download per site** (Garmin BaseCamp / Gaia GPS
   / OsmAnd compatible).
4. **Static GeoJSON dataset published** at `/data/ndwt.geojson`
   for third-party reuse.
5. **Dark mode** via system preference.
6. **Static export, CDN-served** — fast and free to host.

## Copy / brand-voice notes

ndwt.org's voice is informal-historical: "Following the paddle
strokes of tribal cultures and explorers like Lewis & Clark…" Our
About page borrows that wording almost verbatim, which reads well.
Two small things to watch:

- The original always credits **Washington Water Trails
  Association** as the manager and **National Park Service /
  Lewis and Clark Challenge Cost Share Program** as the funder.
  Once partner integration is in scope (see Recommendations), we
  should mirror that attribution somewhere persistent — probably
  in the About page footer block, not the global Footer.
- The original consistently uses **Northwest Discovery Water
  Trail** (no abbreviation) in body copy. We use **NW Discovery
  Water Trail** in the header logo for compactness — fine, but
  body copy should still expand to the full name on first
  reference.
- The original's "Map Your Trip on the Water Trail" sidebar
  promo is the same call-to-action our Hero already does. No gap
  there.

## Recommended priority

Grouped by suggested order of attack, not by phase number.

### Soon (rounds out the data parity already in the GeoJSON)

1. **Add a per-site display name** to the domain model and panel
   header. The source CSV doesn't expose a name field — we'll
   either need to scrape ndwt.org's site detail pages for the
   `<title>` (e.g. "Blalock Canyon") or wait for the WWTA data
   integration to provide canonical names.
2. **Show Notes, Camping Fee, State, County** in the panel when
   present. Almost free — just add the parser fields and
   conditional rows.
3. **Per-site canonical URLs** (`/sites/<id>` or `/sites/<slug>`).
   Static-export friendly via `generateStaticParams`. Fixes the
   "can't share a marker" problem and gives each site a printable
   page. Probably the highest-leverage gap to close.
4. **Site index list** at `/sites/` or as a sidebar on the home
   page — useful when the user knows the site name but can't find
   it on the map.

### Medium (editorial content the trail org provides above-and-beyond)

1. **Leave No Trace, Water Safety, River Navigation pages.** Pull
   copy from ndwt.org with permission/attribution; these are the
   highest practical value to actual boaters.
2. **About → Partners** with the funding/management attribution
   block.
3. **Photo gallery** if WWTA has an existing photo library to
   point at — otherwise low priority.

### Defer / probably out-of-scope

- **Traveler's Forum** — almost certainly belongs at WWTA, not
  here. If WWTA already runs a forum elsewhere, link to it; don't
  rebuild.
- **Trip Reports** — same: link out to whatever WWTA uses.
- **Donate / Volunteer** — should link directly to WWTA's
  existing flows once they're identified, not be reimplemented.
- **Press Coverage** — low engagement value, probably can
  perma-defer.

## Open questions for product

1. What's the WWTA data integration shape? ArcGIS REST endpoint?
   A new database we ingest at build time? Live fetch?
2. Do we have the right to host/mirror ndwt.org's editorial copy
   (Water Safety, Natural World, etc.), or do we need WWTA's
   sign-off and a content review pass first?
3. Is per-site URL `/sites/<numeric-id>` (preserves the original
   `web-scraper-order` IDs) or `/sites/<slug>` (e.g.
   `/sites/blalock-canyon`) preferred? The latter is friendlier
   but requires canonical names first.
4. Is the goal to fully replace ndwt.org, or to be the modern map
   front-end while WWTA hosts the editorial content?
