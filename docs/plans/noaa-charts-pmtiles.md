# NOAA charts via MBTiles → PMTiles (PoC)

Plan + runbook for adding NOAA Chart Display Service raster charts as a
basemap option, hosted as a PMTiles archive served via HTTP range
requests. Status: **PoC complete, deployment paused until NDWT route
extends to Salish Sea.**

## Status

| Step                                                     | Status                                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identify NOAA MBTiles distribution and download workflow | ✅                                                                                                                                                 |
| Convert MBTiles → PMTiles via `go-pmtiles` CLI           | ✅                                                                                                                                                 |
| Wire `ol-pmtiles` into the existing OL layer pipeline    | ✅                                                                                                                                                 |
| Visual confirmation: charts render correctly in dev      | ✅ (Puget Sound + San Juans, zooms 10 + 13)                                                                                                        |
| Range-request behavior verified (no full-file fetch)     | ✅                                                                                                                                                 |
| Demo extract committed to repo for Netlify previews      | ✅ (`public/data/charts/puget-sound-demo.pmtiles`, 11 MB at z0-12)                                                                                 |
| External hosting (R2 / B2) for full-resolution coverage  | ⏸ deferred — needed only when NDWT adds Salish Sea waypoints                                                                                       |
| Refresh automation (weekly NOAA updates)                 | ⏸ deferred                                                                                                                                         |
| User-facing ship                                         | 🚦 conditional — demo is live on Netlify previews and main, but the NOAA Charts button only renders meaningfully when the user pans to Puget Sound |

## Why PMTiles instead of a tile server

NOAA only distributes their Chart Display Service as MBTiles
(SQLite-in-a-file) downloads. To render those tiles on a static
deployment without standing up a Node/Go tile server, we convert each
region to PMTiles — a single-file archive format from
[Protomaps](https://github.com/protomaps/PMTiles) that supports tile
random-access over HTTP range requests. The client library decodes
the directory entries lazily and only fetches the tile bytes it
actually needs.

The PMTiles pattern preserves NDWT's static-export shape (ADR
[0001](../decisions/0001-nextjs-app-router.md)). The archive lives on
a CDN with range-request support; the Next deploy stays small.

## Empirical results

### File sizes (real, measured on 2026-05-13)

| Region                                    | MBTiles | PMTiles     | Compression | Notes                                                                                                |
| ----------------------------------------- | ------- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `ncds_21` (offshore Pacific NW)           | 35 MB   | 18 MB       | 49% smaller | Heavy dedup — 906k tile coords resolve to 6.3k unique PNG payloads (lots of "open ocean" duplicates) |
| `ncds_20c` (Puget Sound)                  | 632 MB  | 496 MB      | 21% smaller | Dense detail, 906k tile coords → 100k unique payloads                                                |
| `ncds_20b` (north Salish Sea + San Juans) | 371 MB  | est. 290 MB | —           | Not converted in this PoC; estimate based on `ncds_20c` ratio                                        |
| **Full Salish Sea coverage estimate**     | ~1 GB   | **~790 MB** | —           | `ncds_20b` + `ncds_20c`                                                                              |

PMTiles is a re-container, not a re-compressor. The size reduction
comes entirely from content-addressed deduplication of repeated PNG
tiles. Open-ocean regions dedup heavily; populated regions don't.

### Conversion times (M-series Mac)

- 35 MB MBTiles → PMTiles: ~1.3 seconds
- 632 MB MBTiles → PMTiles: ~11.8 seconds

### Network behavior (verified in browser)

On a zoom-13 viewport of the San Juans, OL + `ol-pmtiles` issues
**~10 range requests** per pan to the `.pmtiles` file, each fetching
a few KB of tile data. No full-file fetch. HTTP 206 Partial Content
served correctly by Next dev server out of the box; Cloudflare R2,
Backblaze B2, and Netlify all support range requests on static
hosting too.

## How it's wired in this repo

### Source changes

- [`src/components/LayerSwitcher.tsx`](../../src/components/LayerSwitcher.tsx)
  — `BaseMapId` union extended with `'noaa-charts'`; `BASE_MAPS`
  array now has a `{ id: 'noaa-charts', label: 'NOAA Charts' }`
  entry.
- [`src/components/map.tsx`](../../src/components/map.tsx) — imports
  `PMTilesRasterSource` from `ol-pmtiles`, constructs a
  `TileLayer<DataTileSource>` from the env-var URL, adds it to the
  layer array and to the visibility sync effect.

### Runtime URL resolution

The NOAA chart layer's source URL falls through three levels:

1. `NEXT_PUBLIC_NOAA_CHARTS_URL` env var — production override (e.g.
   an R2/B2 CDN URL with full Salish Sea coverage)
2. The committed demo file at `/data/charts/puget-sound-demo.pmtiles`
   — works out of the box on `main`, Netlify previews, and local dev
3. Empty-string sentinel — explicitly disables the layer (button
   stays in the switcher but renders blank). Set
   `NEXT_PUBLIC_NOAA_CHARTS_URL=""` to opt out.

```ts
const noaaChartsLayer = new TileLayer<DataTileSource>({
  source:
    NOAA_CHARTS_PMTILES_URL === ''
      ? undefined
      : new PMTilesRasterSource({
          url: NOAA_CHARTS_PMTILES_URL,
          attributions:
            'Charts: © NOAA Office of Coast Survey — <strong>Not for navigation</strong>',
        }),
  visible: activeBaseMap === 'noaa-charts',
});
```

### Committed demo file

`public/data/charts/puget-sound-demo.pmtiles` is a 11 MB extract of
`ncds_20c` covering Puget Sound + the eastern Olympic Peninsula at
z0-12. Generated with:

```sh
pmtiles extract ncds_20c.pmtiles puget-sound-demo.pmtiles \
  --bbox=-123.3,47.0,-122.2,48.8 --maxzoom=12
```

This file is intentionally tracked in git (the `.gitignore` carves
out an exception) so Netlify deploy previews can show the layer
working without external hosting. Refresh it manually by re-running
the extract command above against a freshly-downloaded
`ncds_20c.mbtiles`.

### Dev workflow

```sh
# 1. Pick a region (see "Finding the right region" below)
mkdir -p .charts-poc public/data/charts
cd .charts-poc
curl -LO https://distribution.charts.noaa.gov/ncds/mbtiles/ncds_20c.mbtiles

# 2. Convert to PMTiles (requires `pmtiles` CLI — `brew install pmtiles`)
pmtiles convert ncds_20c.mbtiles ncds_20c.pmtiles

# 3. Stage in public/ for Next dev
cp ncds_20c.pmtiles ../public/data/charts/

# 4. Point the dev env at it
cat > ../.env.local <<EOF
NEXT_PUBLIC_NOAA_CHARTS_URL=/data/charts/ncds_20c.pmtiles
EOF

# 5. Start dev
cd .. && npm run dev
```

Both `.charts-poc/` and `public/data/charts/` are gitignored — the
PMTiles archive should never be committed.

## Finding the right region

NOAA's NCDS portal is interactive (a clickable Leaflet map at
<https://distribution.charts.noaa.gov/ncds/index.html>). The
backing ArcGIS FeatureService exposes every region's bbox, file size,
and download URL:

```sh
# All regions covering the bbox containing Puget Sound:
curl -s 'https://gis.charttools.noaa.gov/arcgis/rest/services/MarineChart_Services/ncds_tilecache_metadata/MapServer/0/query?geometry=-123.4,47.0,-122.0,49.0&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=name,size,baseline&f=json&returnGeometry=false' | jq '.features[].attributes'
```

The Salish Sea splits across `ncds_20b` (north — San Juans + Strait of
Juan de Fuca) and `ncds_20c` (south — Puget Sound proper).

## Deployment path (when we decide to ship)

### 1. Pick a CDN with range-request support and free/cheap egress

- **Cloudflare R2** — Protomaps' own demos use R2 (zero egress fees,
  S3-compatible API). Recommended.
- **Backblaze B2** — also viable, slightly more expensive on
  egress but Cloudflare CDN fronts it for free.
- **DO NOT** ship the `.pmtiles` archive via Netlify. Their per-file
  cap and 100GB/mo bandwidth budget will both bite. Netlify Large
  Media was deprecated 2023-09-01 with no replacement.

### 2. Set CORS + range headers on the bucket

R2 custom domains do this by default. Verify with:

```sh
curl -sI -r 0-1023 https://your-bucket.example.com/ncds_20c.pmtiles
# Expect:
#   HTTP/2 206
#   accept-ranges: bytes
#   access-control-allow-origin: *  (or your origin)
```

### 3. Set the production env var

In Netlify site settings → Environment variables:

```text
NEXT_PUBLIC_NOAA_CHARTS_URL=https://your-bucket.example.com/ncds_20c.pmtiles
```

The variable is read at build time by Next, so any change requires
redeploying.

### 4. Weekly refresh automation

NOAA regenerates baseline MBTiles weekly. A GitHub Actions cron should:

```yaml
# .github/workflows/refresh-noaa-charts.yml
on:
  schedule:
    - cron: '0 12 * * 1' # Mondays at noon UTC
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -LO https://distribution.charts.noaa.gov/ncds/mbtiles/ncds_20c.mbtiles
          # install pmtiles binary
          curl -L https://github.com/protomaps/go-pmtiles/releases/.../pmtiles-linux-amd64.tar.gz | tar xz
          ./pmtiles convert ncds_20c.mbtiles ncds_20c.pmtiles
          # upload to R2 via rclone or aws-cli
          aws s3 cp ncds_20c.pmtiles s3://${{ secrets.R2_BUCKET }}/ncds_20c.pmtiles \
            --endpoint-url ${{ secrets.R2_ENDPOINT }}
```

Cache invalidation: R2's edge cache is content-addressed, so a new
file with identical contents won't bust caches; but a new tile fetch
re-fetches the archive's directory entries, which read the new
content. No explicit invalidation needed.

### 5. Service worker scope — do NOT add R2 host to TILE_HOSTS

`public/sw.js` intercepts tile fetches cache-first per ADR
[0004](../decisions/0004-tile-resilience.md). Adding the R2 host
would cause the SW to cache multi-megabyte range responses,
defeating the whole point. The existing SW config is correct as-is:
PMTiles requests pass through to the browser's HTTP cache, which
handles range responses correctly.

## Known gaps in this PoC

1. **No tile-health tracking on the chart layer.** The Tier 1+2
   `tileloadend` / `tileloaderror` wiring in `map.tsx` only attaches
   to `OSM | XYZ` sources. `PMTilesRasterSource` extends a different
   class hierarchy (`DataTileSource`) and doesn't emit the same
   events. Adding it would require widening `trackTileEvents` and
   confirming the equivalent events on `DataTileSource`. Low
   priority — the chart layer's failure mode is "blank canvas at the
   right coordinate," which is visible enough.
2. **No e2e coverage.** The PoC was visually validated in dev only.
   Before shipping, an e2e should at least confirm the layer button
   appears and the layer renders without errors when the env var is
   set.
3. **No `LayerKey` mapping for tile-health.** `'noaa-charts'` is
   included in `BaseMapId` so the type system accepts it, but no
   tracker calls it.
4. **Attribution caveat is HTML-encoded** with `<strong>Not for
navigation</strong>`. OL renders attribution as HTML by default;
   double-check this works in the production attribution control
   before shipping.
5. **Chart edges are abrupt.** The PMTiles archive covers only
   Puget Sound; panning the chart layer east of the Cascades shows
   no tiles at all (tile fetches return undefined → blank). A future
   refinement could compose two PMTiles archives (`ncds_20b` +
   `ncds_20c`) into a single archive via the `pmtiles merge` command
   so the chart layer covers the full Salish Sea seamlessly.

## Decision: ship vs defer

This PoC proves the pipeline is real and the integration is small
(~30 LOC of source changes + a 50MB env-flagged data plumbing
diff). Shipping it today would mean:

- Pro: ready for the day NDWT extends to the Salish Sea
- Pro: technically a no-op for current users (env var unset)
- Con: confusing UI — clicking "NOAA Charts" today shows nothing
- Con: ongoing CDN cost (R2 zero-egress is "free" but storage is
  ~$0.015/GB/mo, so 800 MB = $12/year)
- Con: weekly refresh job is real ops work for zero current user value

Recommendation: **keep the PoC branch alive, do not merge to `main`
yet.** When NDWT's `public/data/ndwt.geojson` gains its first Salish
Sea launch site, that's the trigger to pick this up. The branch can
be rebased onto `main` and merged with no source-tree changes
beyond what's already in it.
