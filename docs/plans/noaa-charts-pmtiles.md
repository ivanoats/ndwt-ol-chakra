# NOAA charts via MBTiles → PMTiles

Plan + runbook for the NOAA Chart Display Service raster charts as a
basemap option, hosted as a PMTiles archive on Cloudflare R2 and
served via HTTP range requests. **Status: shipped behind a Netlify
env var.**

## Status

| Step                                                     | Status                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Identify NOAA MBTiles distribution and download workflow | ✅                                                                      |
| Convert MBTiles → PMTiles via `go-pmtiles` CLI           | ✅                                                                      |
| Wire `ol-pmtiles` into the existing OL layer pipeline    | ✅ (PR #73)                                                             |
| Visual confirmation: charts render correctly in dev      | ✅ (Puget Sound + San Juans, zooms 10 + 13)                             |
| Range-request behavior verified (no full-file fetch)     | ✅                                                                      |
| Cloudflare R2 hosting for full-resolution coverage       | ✅ (PR #74, bucket: `wwta`)                                             |
| Weekly refresh GitHub Action                             | ✅ (`.github/workflows/refresh-noaa-charts.yml`)                        |
| Manual upload runbook script                             | ✅ (`scripts/upload-noaa-charts.sh`)                                    |
| User-facing ship                                         | 🚦 gated on `NEXT_PUBLIC_NOAA_CHARTS_URL` being set in Netlify env vars |

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

The NOAA chart layer's source URL comes from
`NEXT_PUBLIC_NOAA_CHARTS_URL` at build time. When the env var is
unset (or empty string), the layer's source is `undefined` —
selecting "NOAA Charts" in the layer switcher renders a blank canvas
with just the attribution string. This is the default on `main` and
on any environment that hasn't been configured.

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

### Dev workflow (local PMTiles)

For local dev without R2 credentials, you can serve a PMTiles file
from the dev server directly:

```sh
# 1. Download + convert (requires `brew install pmtiles`)
mkdir -p .charts-poc public/data/charts
cd .charts-poc
curl -LO https://distribution.charts.noaa.gov/ncds/mbtiles/ncds_20c.mbtiles
pmtiles convert ncds_20c.mbtiles ncds_20c.pmtiles

# 2. Stage in public/ for Next dev
cp ncds_20c.pmtiles ../public/data/charts/

# 3. Point the dev env at it
cat > ../.env.local <<EOF
NEXT_PUBLIC_NOAA_CHARTS_URL=/data/charts/ncds_20c.pmtiles
EOF

# 4. Start dev
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

## Production deployment

NDWT serves the production chart layer from **Cloudflare R2** (bucket
`wwta`). Two automated mechanisms keep the archive fresh and the site
wired up; the steps below are the one-time bootstrap.

### Why R2 (not Netlify, not Backblaze)

- **Not Netlify** — Large Media was deprecated 2023-09-01; per-file
  asset caps and 100 GB/mo bandwidth on the free tier both bite when
  the archive is ~500 MB and every map session range-fetches tens of
  MB of tiles.
- **R2** has zero egress fees, S3-compatible API, and is what
  Protomaps' own demo (`r2-public.protomaps.com`) uses. The free
  tier covers NDWT's workload entirely — actual bill is **$0**.

  R2 free-tier limits and our usage against them:

  | Resource             | Free tier   | NDWT usage (today)        | NDWT usage (full Salish Sea projection) |
  | -------------------- | ----------- | ------------------------- | --------------------------------------- |
  | Storage              | 10 GB-month | ~500 MB (`ncds_20c`)      | ~800 MB (`ncds_20b` + `ncds_20c`)       |
  | Class A ops (writes) | 1M / month  | ~52 / year                | ~104 / year                             |
  | Class B ops (reads)  | 10M / month | range-fetches per session | range-fetches per session               |
  | Egress               | unmetered   | unmetered                 | unmetered                               |

  If we were entirely outside the free tier the storage cost would
  be `0.5 GB × $0.015/GB/mo × 12 mo ≈ $0.09/year` (or `~$0.14/year`
  at 800 MB full coverage); read ops at $0.36/million stay below
  $0.05/year unless NDWT hits multi-million monthly sessions.
  Cost is not a deployment blocker at any realistic NDWT scale.

- **Backblaze B2** also works (fronted by Cloudflare CDN for free
  egress) — slightly more expensive and an extra layer of config.

### One-time bootstrap

#### 1. Set GitHub Actions secrets

Repo settings → Secrets and variables → Actions → New repository
secret. Add three secrets:

```text
R2_ACCESS_KEY_ID         — from Cloudflare dashboard → R2 → Manage R2 API tokens
R2_SECRET_ACCESS_KEY     — generated alongside R2_ACCESS_KEY_ID
R2_ENDPOINT_URL          — https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

The R2 API token should be scoped **Read + Write** on the `wwta`
bucket only (least privilege; lets you rotate it independently of
other R2 access if needed).

#### 2. Set GitHub Actions variables

Same UI, "Variables" tab. Add one repo variable:

```text
R2_BUCKET                — wwta
```

Variables are visible in workflow logs; secrets aren't. Bucket name
is non-sensitive so it lives as a variable.

#### 3. First upload

Either trigger the workflow manually:

```sh
gh workflow run refresh-noaa-charts.yml
gh run watch
```

Or run the manual script (requires the same R2 env vars in your
shell):

```sh
export R2_ACCESS_KEY_ID=...
export R2_SECRET_ACCESS_KEY=...
export R2_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
export R2_BUCKET=wwta
./scripts/upload-noaa-charts.sh ncds_20c
```

Both paths produce `s3://wwta/charts/ncds_20c.pmtiles`.

#### 4. Verify the file is publicly readable with range requests

```sh
# Replace with your actual public R2 URL (r2.dev or custom domain):
curl -sI -r 0-1023 https://<your-public-r2-url>/charts/ncds_20c.pmtiles
# Expect:
#   HTTP/2 206
#   accept-ranges: bytes
#   access-control-allow-origin: *
```

If CORS is missing, configure it on the R2 bucket dashboard:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length"]
  }
]
```

Tighten `AllowedOrigins` to your specific domains once you're done
testing.

#### 5. Set the Netlify env var

In the Netlify site dashboard → Site configuration → Environment
variables → Add a variable:

```text
NEXT_PUBLIC_NOAA_CHARTS_URL = https://<your-public-r2-url>/charts/ncds_20c.pmtiles
```

`NEXT_PUBLIC_*` is read at build time by Next, so the next deploy
will pick it up. Trigger a redeploy or push any commit.

### Ongoing operation

- **Weekly refresh** runs automatically via
  `.github/workflows/refresh-noaa-charts.yml` — Mondays at 12:00 UTC.
  The workflow downloads the latest NOAA NCDS region 20c, converts to
  PMTiles, and uploads to R2 at the same path. PMTiles is content-
  addressed by tile bytes, so unchanged tiles produce identical
  range-response payloads; browsers' HTTP caches degrade gracefully.
- **Manual refresh** for ad-hoc updates: `gh workflow run
refresh-noaa-charts.yml -f region=ncds_20c` (or any other NCDS
  region name).
- **Cloudflare edge cache**: R2 doesn't front-cache by default; if
  you've enabled Cloudflare CDN caching on the bucket's custom
  domain, you may need to purge it after a refresh. The PMTiles
  format tolerates a mismatch between the directory and tile content
  briefly (PMTiles JS re-reads the header on each session), but
  consistent post-refresh behavior requires purging.

### Service worker scope — do NOT add R2 host to TILE_HOSTS

`public/sw.js` intercepts tile fetches cache-first per ADR
[0004](../decisions/0004-tile-resilience.md). Adding the R2 host
would cause the SW to cache multi-megabyte range responses,
defeating the whole point. The existing SW config is correct as-is:
PMTiles requests pass through to the browser's HTTP cache, which
handles range responses correctly.

## Known gaps

1. **No tile-health tracking on the chart layer.** The Tier 1+2
   `tileloadend` / `tileloaderror` wiring in `map.tsx` only attaches
   to `OSM | XYZ` sources. `PMTilesRasterSource` extends a different
   class hierarchy (`DataTileSource`) and doesn't emit the same
   events. Adding it would require widening `trackTileEvents` and
   confirming the equivalent events on `DataTileSource`. Low
   priority — the chart layer's failure mode is "blank canvas at the
   right coordinate," which is visible enough.
2. **No e2e coverage of the R2-served layer.** The Netlify env var
   isn't set on PR-preview deploys (only on production), so an e2e
   that asserts chart tiles render only fires meaningfully on
   `main`. The LayerSwitcher button test (added in PR #73) is the
   only unit coverage today.
3. **No `LayerKey` mapping for tile-health.** `'noaa-charts'` is
   included in `BaseMapId` so the type system accepts it, but no
   tracker calls it.
4. **Attribution caveat is HTML-encoded** with `<strong>Not for
navigation</strong>`. OL renders attribution as HTML by default;
   double-check this works in the production attribution control
   before shipping.
5. **Chart edges are abrupt.** The R2-hosted archive currently
   covers only `ncds_20c` (Puget Sound); panning west into the
   Strait of Juan de Fuca or north into the Gulf Islands shows no
   tiles. To extend coverage, the GHA workflow accepts a `region`
   input — run `gh workflow run refresh-noaa-charts.yml -f
region=ncds_20b` to upload `ncds_20b.pmtiles` alongside. A future
   refinement could compose multiple archives into one via the
   `pmtiles merge` command so the chart layer covers the full
   Salish Sea seamlessly.
