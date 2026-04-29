# Northwest Discovery Water Trail dataset

This directory ships with the static deploy and is the canonical
public dataset for the Northwest Discovery Water Trail.

## Files

| File | Shape | Source |
| --- | --- | --- |
| `ndwt.geojson` | GeoJSON `FeatureCollection` (Point geometries) | Captured from ndwt.org during Phases 1–3 of the rebuild; enriched in Phase 8 with canonical site names + state/county/camping fee/notes. |
| `sites.csv` | CSV mirror of the same dataset | Backup snapshot. Not used at runtime; kept for legibility and recovery. |

The site application reads `ndwt.geojson` once at build time
(`src/adapters/inbound/next/load-sites.ts`) and inlines the
parsed `Site[]` into the static page tree. There is no runtime
fetch.

## `ndwt.geojson` feature properties

```jsonc
{
  "name": "Blalock Canyon", // canonical site name
  "riverName": "Columbia",
  "riverMile": "234", // string in the source; parsed to number
  "riverSegment": "Lake Umatilla",
  "bank": "OR",
  "state": "OR", // optional, often blank in source data
  "county": "Gilliam", // optional, often blank in source data
  "season": "year round", // optional
  "camping": "None", // optional, free text
  "campingFee": "$10/night", // optional, free text
  "contact": "US Army Corps of Engineers", // optional
  "phone": "(555) 555-5555", // optional
  "website": "https://example.org/site", // optional
  "notes": "Popular salmon fishing in autumn.", // optional, free text

  // Facility flags. "1" = present, "0" = absent. Nine total:
  "restrooms-src": "1",
  "potableWater-src": "0",
  "marineDumpStation-src": "0",
  "dayUseOnly-src": "0",
  "picnicShelters-src": "1",
  "boatRamp-src": "1",
  "handCarried-src": "0",
  "marina-src": "0",
  "adaAccess-src": "0",

  // Legacy keys, retained for redirect mapping after Phase 14:
  "web-scraper-order": "1639846015-81", // primary key from ndwt.org
  "web-scraper-start-url": "http://www.ndwt.org/ndwt/explore/site.asp?site=130"
}
```

Geometry is always `{ "type": "Point", "coordinates": [lng, lat] }`.

## Provenance and reuse

Trail content (names, notes, facility data) was originally
published on [ndwt.org](http://www.ndwt.org). Reuse permission was
granted by the
[Washington Water Trails Association](https://www.wwta.org)
Executive Director — see [`/NOTICE.md`](../../NOTICE.md) at the
repository root.

External GIS / mapping consumers are welcome to use this file
directly. The application code that wraps it is MIT-licensed (see
[`/LICENSE`](../../LICENSE)); the trail content remains the
property of WWTA and its predecessors.

## Re-generating `ndwt.geojson` from ndwt.org

Future updates are expected to come from WWTA's
Salesforce / ArcGIS systems via a new inbound adapter — not from
re-scraping ndwt.org. The
[`/scripts/scrape-ndwt-sites.ts`](../../scripts/scrape-ndwt-sites.ts)
script is kept as historical provenance and as a fallback. To
re-run:

```sh
npm run scrape:sites
```

It walks every `web-scraper-start-url` in the GeoJSON, fetches the
detail page, and overwrites the `name` / `state` / `county` /
`campingFee` / `notes` properties in place. Spatial fields and
facility flags are preserved.

## Schema stability

This file is published at `/data/ndwt.geojson` and is part of the
site's public surface area. Property additions are backwards
compatible; renames or removals are not. Bump the dataset version
in this README and call out breaking changes in the release notes
if the schema ever needs to change.
