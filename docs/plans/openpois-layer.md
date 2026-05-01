# Investigation: OpenPOIs as a map layer

## Status

Planning — review before implementing.

## What is OpenPOIs?

[OpenPOIs](https://github.com/henryspatialanalysis/OpenPOIs) is a
unified, confidence-scored open dataset of U.S. points of interest,
built by conflating [OpenStreetMap](https://www.openstreetmap.org)
and [Overture Maps](https://overturemaps.org). Key properties:

- **Coverage**: all 50 U.S. states; tens of millions of POIs.
- **Confidence scores**: each POI carries a Bayesian turnover
  estimate (probability the place still exists). Helpful for
  de-cluttering stale data.
- **Refresh cadence**: monthly (follows Overture Maps releases).
- **Data delivery**:
  - Parquet files on
    [Source Cooperative](https://source.coop/henryspatialanalysis/openpois)
    (anonymous read from S3).
  - PMTiles archives for tile-based map rendering (used by the
    live MapLibre GL map at [openpois.org](https://openpois.org)).
- **License**: data is
  [ODbL v1.0](https://opendatacommons.org/licenses/odbl/1-0/) —
  open for any use with attribution; derivative databases must
  also be released under ODbL.

## Are there useful POIs for kayakers camping along the trail?

**Yes — several categories are directly relevant.**

The Northwest Discovery Water Trail runs along the
Snake, Clearwater, and Columbia rivers through central Washington,
northern Oregon, and western Idaho. A multi-day paddling trip
along this corridor involves:

- Finding overnight camping beyond the ~150 designated NDWT sites.
- Resupplying (food, fuel, drinking water) in river towns.
- Emergency response — medical facilities and river rescue stations.
- Vehicle shuttles — fuel, parking, gear drop.
- Bail-out options (motels, laundry) when weather or fatigue
  intervenes.

### Tier 1 — High value (directly affects safety or trip planning)

| POI category (OSM/Overture)              | Why it matters for paddlers                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `campground`, `camp_site`, `rv_park`     | Additional overnight options beyond the NDWT sites — especially for shoulder sections with sparse NDWT access. |
| `hospital`, `urgent_care`                | River accidents. Knowing the nearest ER before you push off is safety-critical.                                |
| `grocery`, `supermarket`, `convenience`  | Primary resupply for multi-day trips. Many river towns have only one option.                                   |
| `gas_station`, `fuel`                    | Shuttle drivers need fuel. Also camp stove canisters at outdoor shops.                                         |
| `boat_ramp`, `marina`                    | Additional water access and take-out points beyond NDWT sites.                                                 |
| `drinking_water` (at parks / trailheads) | Potable water sources between NDWT sites with water facilities.                                                |
| `pharmacy`                               | Medication refill; first-aid supplies on long trips.                                                           |

### Tier 2 — Useful (quality-of-life, gear, and logistics)

| POI category                             | Why it matters for paddlers                                             |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `restaurant`, `fast_food`                | Hot meal and morale boost near portages and town stops.                 |
| `motel`, `hostel`, `hotel`               | Bail-out option for weather windows or end-of-trip night.               |
| `laundromat`                             | Multi-week trips generate laundry; river towns have one laundromat.     |
| `outdoor_gear`, `sporting_goods`         | Gear repair or replacement — dry bags, paddles, PFDs.                   |
| `hardware_store`                         | Duct tape, epoxy, zip ties — the paddler's repair kit.                  |
| `fire_station`, `police`, `coast_guard`  | Local emergency contacts when cell service is absent.                   |
| `portage`, `lock`, `dam` (navigation)    | Already in River Navigation content, but a map layer makes them visual. |

### Tier 3 — Nice-to-have (community / leisure)

| POI category               | Why it matters                                        |
| -------------------------- | ----------------------------------------------------- |
| `brewery`, `winery`        | River paddling culture; popular post-paddle stops.    |
| `cafe`, `bakery`           | Morning coffee in river towns.                        |
| `picnic_site`, `viewpoint` | Day-hike off-river; scenic rest stops.                |

### What OpenPOIs offers vs. raw OSM

The meaningful advantage of OpenPOIs over querying OSM directly
via the Overpass API is the **confidence score**. Abandoned
businesses are common in small Columbia/Snake basin towns; the
Bayesian turnover model filters down to records with high
probability of still existing. That means fewer "kayak 10 miles
to the grocery store that closed in 2019" surprises.

For the categories we care about most (hospitals, marinas),
confidence scoring matters less — these tend to be stable. For
convenience stores and restaurants in remote river towns, it
matters a lot.

## Technical approach

### Option A — Pre-filtered static GeoJSON (recommended for v1)

Extract the NDWT corridor bounding box from the OpenPOIs Parquet
files at script time; ship the result as a static file alongside
`ndwt.geojson`.

```text
bounding box (degrees):
  min_lon: -120.0  max_lon: -114.0
  min_lat:  44.5   max_lat:  47.5
  (covers Snake / Clearwater / Columbia corridor with ~60 km buffer)
```

**Script**: `scripts/refresh-pois.ts` (or `scripts/refresh-pois.py`
for the DuckDB query — Python is the first-class runtime for the
Parquet dataset).

The script:

1. Reads the latest Parquet partition from Source Cooperative S3
   using DuckDB or pyarrow with a spatial bounding-box filter.
2. Filters to Tier 1 + Tier 2 categories using the
   `fclass` / `category` column in the Overture schema.
3. Filters to confidence ≥ 0.75 (removes ~25% of high-turnover
   records like restaurants and bars that are most prone to churn).
4. Outputs `public/data/pois-ndwt.geojson` (point features with
   `name`, `category`, `confidence`, `address` properties).

Estimated output size: a few hundred features for the corridor;
probably < 200 KB GeoJSON uncompressed, well within the
static-asset budget.

**Build-time load**: `src/adapters/inbound/next/load-pois.ts`
mirrors `load-sites.ts` — reads `public/data/pois-ndwt.geojson`
with `fs/promises` at build time and returns a typed `Poi[]` array.

**Map layer**: a new `VectorLayer` with a `VectorSource` in
`map.tsx`, behind a new `OverlayId = 'pois'` toggle in the
LayerSwitcher. Rendered with category-specific icons (using OL's
`Icon` style from SVG sprites, or differentiated `Circle`
styles by category group).

**Layer switcher**: the existing `LayerSwitcher.tsx` already
supports multiple overlay toggles; adding `{ id: 'pois', label:
'Services & Camping' }` extends the existing pattern.

**Info panel**: clicking a POI opens a lightweight popover (not
the full `SiteInfoPanel` Drawer) showing name, category,
confidence, and address. A small `PoiPopup` component using
an Ark UI `Popover` fits the existing architectural pattern.

**Script cadence**: run manually when a monthly Overture Maps
release lands (ideally automated as a scheduled GitHub Actions
workflow that opens a PR with the updated `pois-ndwt.geojson`).

### Option B — PMTiles overlay (deferred)

OpenPOIs publishes the full dataset as PMTiles archives on Source
Cooperative. OpenLayers can render PMTiles via
`ol-pmtiles` (community package) or via a custom `TileLayer` with
`VectorTileSource`. This would stream only the tiles for the
current viewport, avoiding the pre-filter step.

**Why defer**: the `ol-pmtiles` package is a community add-on
(not first-party OL) and adds a new runtime dependency. The full
U.S. dataset PMTiles file is large (~several GB); Source
Cooperative's anonymous access is unauthenticated but
rate-limited. For a corridor as small as the NDWT, a
pre-filtered static GeoJSON is simpler, faster, and more
predictable. Revisit if the corridor ever expands to cover
multiple water trails or if the refresh cadence needs to be
fully automated without a build step.

### Option C — Direct Overpass API query (rejected)

Query the OSM Overpass API at runtime for the bounding box.
Rejected: runtime fetch slows first paint; Overpass has strict
rate limits; and OpenPOIs's confidence scoring is lost.

## Data licensing

Adding OpenPOIs data requires the following:

1. **Attribution in the map UI**: "POI data: © OpenPOIs (ODbL) |
   OpenStreetMap contributors | Overture Maps Foundation". This
   follows the same pattern as the existing layer attributions in
   `map.tsx`.
2. **Attribution in `NOTICE.md`** alongside the existing
   content-reuse grants from WWTA.
3. **License tag on `public/data/pois-ndwt.geojson`**: the file
   header comment or an adjacent `pois-ndwt.geojson.LICENSE` file
   should read: "Derived from OpenPOIs (<https://openpois.org>),
   © OpenStreetMap contributors, Overture Maps Foundation.
   Licensed under ODbL v1.0 (<https://opendatacommons.org/licenses/odbl/1-0/>)."
4. **ODbL propagation**: the `pois-ndwt.geojson` file itself is
   a derived database — it must be released under ODbL. Our
   existing `public/data/ndwt.geojson` dataset is not affected
   because it is a separate file with its own provenance.
   As long as we don't merge the two files into a single database,
   the ODbL does not propagate to `ndwt.geojson`.

## Implementation checklist (when ready to build)

This plan is intentionally **not yet in a phase** — it should be
reviewed and approved before work begins. When approved:

- [ ] Phase A (script): `scripts/refresh-pois.py` — DuckDB query
  from Source Cooperative S3, bounding-box + category + confidence
  filter → `public/data/pois-ndwt.geojson`.
- [ ] Phase B (data + domain): `Poi` type in `src/domain/`; `load-pois.ts`
  inbound adapter; pass `pois` to `MapApp`.
- [ ] Phase C (map layer): new `'pois'` overlay in `LayerSwitcher`
  and `map.tsx`; category-specific circle styles for Tier 1 vs.
  Tier 2.
- [ ] Phase D (info): `PoiPopup` component shown on feature click
  (distinct from the full `SiteInfoPanel` Drawer).
- [ ] Phase E (attribution + license): update `NOTICE.md`,
  `public/data/pois-ndwt.geojson.LICENSE`, and the layer
  attribution string in `map.tsx`.
- [ ] Phase F (refresh automation): GitHub Actions workflow on a
  monthly schedule that runs the script and opens a PR.

## Open questions for review

1. **Which POI categories to include in v1?** The Tier 1 list
   above is a safe starting point, but the Overture schema
   category strings need to be verified against the live Parquet
   data before filtering.
2. **Confidence threshold**: 0.75 is an initial guess. A sampling
   pass over the corridor (looking at a random 50 records) would
   validate whether 0.75 is too strict (misses real places) or
   too loose (shows closed restaurants).
3. **Icon design**: should Tier 1 (safety/resupply) use a different
   visual treatment from Tier 2 (convenience)? A category-grouped
   approach (e.g. a hospital icon, a tent icon, a fuel icon) would
   be the most useful but requires SVG sprite work.
4. **Popup vs. panel**: should a POI click open a Popover
   (lightweight, dismisses on map click) or the same Drawer as
   NDWT sites? Popover seems right — these are supplementary data,
   not first-class trail sites.
5. **ODbL and ndwt.geojson merge risk**: confirm with the project
   owner that we will never merge `pois-ndwt.geojson` into
   `ndwt.geojson` (which would bring ODbL obligations onto the
   whole site dataset).
6. **Monthly refresh automation**: is a GitHub Actions cron job
   acceptable, or does the repo owner prefer manual script runs
   that produce explicit commit diffs for review?

## Recommendation

**Proceed with Option A (pre-filtered static GeoJSON), Tier 1
categories only, in a follow-up phase after Phase 14 (the
cutover).** Rationale:

- The Tier 1 categories (camping, hospitals, grocery, fuel,
  water access, pharmacy) meaningfully extend trip-planning
  safety information that no existing layer provides.
- The static GeoJSON approach fits the project's existing
  build-time data-loading pattern without adding runtime network
  dependencies or new npm packages.
- Limiting v1 to Tier 1 keeps the visual layer uncluttered and
  the scope reviewable.
- The ODbL attribution requirement is well-understood and easily
  met.
- Deferring until after Phase 14 avoids adding new scope to the
  cutover critical path.

## See also

- [`modernization.md`](./modernization.md) — Phases 1–7
- [`feature-parity.md`](./feature-parity.md) — Phases 8–14
- [`../gap-analysis.md`](../gap-analysis.md) — sitemap and
  data-field gap analysis vs. ndwt.org
