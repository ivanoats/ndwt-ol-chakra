# Photo candidates for site detail pages

## Status

| Step                                              | State   |
| ------------------------------------------------- | ------- |
| Wikimedia Commons geosearch + license filter      | Done    |
| Title/mime filter for orbital + aerial noise      | Done    |
| WWTA WordPress NextGen Gallery — stubbed (Keychain auth) | Done; needs live JSON confirmation |
| Flickr CC search                                  | Planned |
| Mapillary street-level imagery                    | Planned |
| USGS / NPS public-domain libraries                | Planned |
| Curated `photo-candidates.json` committed to repo | Planned |
| Display photos on `/sites/<slug>` detail page     | Planned |
| Display photo gallery at `/about/photo-gallery/`  | Planned |

## Goal

Each of the 159 sites in `public/data/ndwt.geojson` should have
zero or more candidate photos to optionally show on its
`/sites/<slug>/` detail page. Candidates need to be:

- **Reusable** — explicit license (CC0, CC BY, CC BY-SA, public
  domain). Anything else gets dropped at scrape time.
- **Relevant** — ground-level photos of the site itself, the
  river segment, or nearby landmarks. Filter out satellite /
  aerial imagery that geosearch indexes at the lat/lon of its
  nadir.
- **Attributed** — every candidate carries the photographer's
  name (when known) and the license URL so attribution can be
  rendered in the UI.

## Today's draft

### `scripts/find-photos.py`

Standard-library Python, no `pip install` needed. Reads
`public/data/ndwt.geojson` and writes
`public/data/photo-candidates.json` (currently gitignored —
filters are still being iterated).

```sh
python3 scripts/find-photos.py            # all 159 sites
python3 scripts/find-photos.py --limit 5  # smoke-test mode
python3 scripts/find-photos.py --radius 8000  # 8 km radius (max 10 km)
```

Output shape (one entry per site):

```jsonc
{
  "site_id": "1639846105-122",
  "site_name": "Hood Park",
  "river": "Snake",
  "mile": "2",
  "lat": 46.21,
  "lon": -118.87,
  "candidates": [
    {
      "source": "wikimedia-commons",
      "title": "Hood Park boat ramp.jpg",
      "url": "https://upload.wikimedia.org/.../Hood_Park_boat_ramp.jpg",
      "thumb_url": "https://upload.wikimedia.org/.../800px-Hood_Park_boat_ramp.jpg",
      "page_url": "https://commons.wikimedia.org/wiki/File:Hood_Park_boat_ramp.jpg",
      "mime": "image/jpeg",
      "photographer": "Jane Doe",
      "license": "CC BY-SA 4.0",
      "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
      "dist_m": 84.4,
    },
  ],
}
```

### Source: Wikimedia Commons

Two-step API flow:

1. `list=geosearch` with `gscoord=lat|lon`, `gsradius` (≤ 10 km),
   `gsnamespace=6` for the `File:` namespace.
2. `prop=imageinfo` with `iiprop=url|mime|extmetadata` to fetch
   the URL, license, and photographer for each result.

Results filtered to:

- **License**: starts with `CC0`, `CC BY`, `Public domain`, or
  `PD`.
- **Title**: doesn't start with `ISS`, `STS`, `Earth-`,
  `Landsat`, `Sentinel-`, `MOD`, or `Apollo`.
- **Filename**: doesn't contain `View of Earth`,
  `satellite image`, `from space`, or `orthophoto`.
- **MIME**: not `image/tiff` (drops USGS aerial ortho tiles).

Smoke-test results (5 sites, 5 km radius):

| Site               | Candidates                        |
| ------------------ | --------------------------------- |
| Blalock Canyon     | 0 (remote, no Commons coverage)   |
| Harper's Bend      | 1 (historic landmark in Peck, ID) |
| Paterson Boat Ramp | 2 (Telegraph Island petroglyphs)  |
| Hood River Marina  | 10 (waterfront walk series)       |
| The Hook           | 10 (same waterfront cluster)      |

## Open TODOs

### 1. Flickr CC search

Flickr has a much larger pool of geotagged ground-level photos
than Commons, but requires an API key.

- API: <https://www.flickr.com/services/api/flickr.photos.search.html>
- Auth: `FLICKR_API_KEY` env var (free, registration at
  <https://www.flickr.com/services/api/keys/>).
- License filter: `license=4,5,6,7,9,10` for CC BY / CC BY-SA /
  CC BY-ND / CC BY-NC / public-domain / CC0 — drop `9` and `7`
  if we want only commercial-use-OK (NC excludes commercial; ND
  forbids derivatives).
- Add a `flickr_candidates_for(lat, lon, radius_m)` function
  alongside `commons_candidates_for` and call it from
  `find_candidates`.

### 2. WWTA WordPress NextGen Gallery — stubbed

`wwta_gallery_candidates_for(site)` is now in
`scripts/find-photos.py`. It:

- Resolves credentials via macOS Keychain
  (`security find-generic-password -a $WWTA_WP_USER -s wwta-wp-app-password -w`),
  with `WWTA_WP_APP_PASSWORD` env-var fallback for non-Mac CI.
- Queries `/wp-json/ngg/v1/admin/attach_to_post/galleries`
  with HTTP Basic auth.
- Fuzzy-matches each gallery's name against the current
  site's name (lowercase, alphanumeric-only, both substring
  directions).
- For each matched gallery, fetches its images and turns them
  into candidate dicts with
  `license: "WWTA permission (per NOTICE.md)"`.
- Skips silently when no creds configured — Wikimedia source
  still runs.

**Pending**: confirm the live response shape. The stub guesses
`name` / `title` / `gid` / `image_url` field names but NextGen's
actual JSON may differ slightly. First real run will surface any
adjustments needed.

To enable on a developer machine:

```sh
security add-generic-password -U \
  -a 'YOUR-WP-USERNAME' \
  -s 'wwta-wp-app-password' \
  -w  # prompts for the password without echoing
export WWTA_WP_USER='YOUR-WP-USERNAME'
python3 scripts/find-photos.py --limit 5
```

Photos aren't geocoded on the WordPress side, so the
fuzzy-name match is the only correlation we have. If WWTA's
album naming doesn't match site names cleanly, fall back to
hand-curating a `site_id → gallery_id` map in YAML or JSON.

### 3. Mapillary street-level

Mapillary has user-uploaded street-level imagery with reasonable
geocoding. Better for boat-ramp / parking-lot / road-approach
shots than for the water itself.

- API: <https://www.mapillary.com/developer/api-documentation/>
- Auth: OAuth client token.
- License: CC BY-SA on user uploads.

### 4. USGS / NPS public-domain libraries

- USGS multimedia gallery: <https://www.usgs.gov/news/multimedia-gallery>
- NPS multimedia: <https://www.nps.gov/aboutus/multimedia.htm>

Neither has a geocoded REST endpoint. Site-name keyword search
through their public APIs would be the integration path. Lower
priority than the three above; useful mainly for historic /
agency-context photos.

### 5. Filter quality improvements

- The current title/mime filter is a denylist. A category-based
  filter using Commons' `categories` field would be more
  precise (e.g. include only categories matching `Boats`,
  `Rivers`, `Parks`, `Boat ramps`, `Marinas`).
- Some sites have very dense Commons coverage (Hood River
  Marina) and others have none (Blalock Canyon). Consider a
  per-site cap so the JSON doesn't grow unbounded.
- Sort candidates by `dist_m` ascending so closest results lead.
  Currently they come back in Wikimedia's geosearch order which
  is also by distance, but worth being explicit.

## Curation workflow (when ready)

1. Run the scraper with all sources enabled →
   `public/data/photo-candidates.json`.
2. **Manual review pass**: for each site with candidates, pick
   the best 1–3 photos. Reject anything that isn't actually a
   photo of the site or its immediate context. Note any sites
   that need a fresh photo commissioned (Blalock Canyon-style
   blanks).
3. Write the curated set to `public/data/site-photos.json`
   (different filename so it's clearly the curated artifact, not
   the raw scrape). Commit this file.
4. Update the loader (`src/adapters/inbound/next/load-sites.ts`)
   to merge `site-photos.json` into the parsed `Site[]` the
   same way Phase 8 used to merge `ndwt-enriched.json` (now
   inlined into the GeoJSON).
5. Render photos on `/sites/<slug>/` — likely a small carousel
   in `src/components/panels/SiteDetails.tsx`. Always show the
   photographer + license per the attribution requirement.
6. Update `/about/photo-gallery/` (currently a link-out to WWTA)
   to optionally render a grid of curated photos with a link
   back to each site. Keep the WWTA link too.

## Integration shape

When this lands, `Site` gains an optional `photos` field:

```ts
interface Site {
  // ... existing fields
  readonly photos?: readonly SitePhoto[];
}

interface SitePhoto {
  readonly url: string;
  readonly thumbUrl?: string;
  readonly photographer?: string;
  readonly license: string;
  readonly licenseUrl?: string;
  readonly source:
    | 'wikimedia-commons'
    | 'flickr'
    | 'wwta-gallery'
    | 'mapillary'
    | 'other';
  readonly sourceUrl: string;
  readonly caption?: string;
}
```

This follows the same pattern as the Phase 8 `name` /
`state` / `county` enrichment fields — optional, always with
attribution metadata, never assumed present.

## Permissions and attribution

All candidates must surface their photographer + license URL in
the rendered UI. Prior phases set the precedent:

- The base GeoJSON dataset reuse permission lives in
  [`/NOTICE.md`](../../NOTICE.md).
- Editorial content carries an attribution footer pointing at
  the same NOTICE.
- Photos are different — each individual image has its own
  attribution, not WWTA's blanket grant. Render the
  photographer + license inline, e.g. `Photo: Jane Doe / CC
BY-SA 4.0 (Wikimedia Commons)`.

The license filter in the scraper guarantees we only ever
collect images we can legally redistribute. The UI must still
display the credit per each license's terms.
