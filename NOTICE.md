# Content provenance and reuse permission

## Northwest Discovery Water Trail content

This site reuses content originally published on
[ndwt.org](http://www.ndwt.org), including:

- Per-site display names, state, county, camping fees, and notes,
  scraped from individual `site.asp?site=<id>` pages and merged
  into the feature properties of
  [`public/data/ndwt.geojson`](./public/data/ndwt.geojson) (see
  [`scripts/scrape-ndwt-sites.ts`](./scripts/scrape-ndwt-sites.ts)
  and [`public/data/README.md`](./public/data/README.md)).
- Editorial content for the Water Safety, River Navigation,
  Leave No Trace, Natural World, Past & Present, and About
  sections (added in later phases of the rebuild — see
  [`docs/plans/feature-parity.md`](./docs/plans/feature-parity.md)).

This reuse is **expressly permitted** by the
[Washington Water Trails Association](https://www.wwta.org)
(WWTA), which manages the trail. The Executive Director granted
full reuse rights for ndwt.org's content and copy in
correspondence with the maintainer of this repository, ahead of
Phase 8 (data enrichment) of the modernization plan.

The Northwest Discovery Water Trail itself is a project of:

- **Washington Water Trails Association** — current management
  and stewardship.
- **National Park Service / Lewis and Clark Challenge Cost Share
  Program** — original funding (the funder of record on the
  legacy ndwt.org site).

## Code

The application code (everything in `src/`, `app/`,
`scripts/`, etc.) is licensed under MIT — see [`LICENSE`](./LICENSE).
The reused trail-organization content remains the property of
WWTA and its predecessors; this repository's MIT license applies
only to the code that wraps it.

## Spatial dataset

`public/data/ndwt.geojson` and `public/data/sites.csv` are the
original GeoJSON dataset (~150 launch sites with facility flags
and coordinates). They were captured from ndwt.org during
Phases 1–3 of the rebuild and are republished here under the
same WWTA permission.

## Map basemap

OpenStreetMap tile imagery is served by OpenStreetMap's tile
infrastructure under the
[Open Database License](https://www.openstreetmap.org/copyright).
Attribution is rendered in the bottom-right of the map.

## Questions or corrections

Open an issue at
[github.com/ivanoats/ndwt-ol-chakra](https://github.com/ivanoats/ndwt-ol-chakra)
or contact WWTA directly via [wwta.org](https://www.wwta.org).
