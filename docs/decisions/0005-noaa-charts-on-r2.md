# ADR 0005 — Serve NOAA charts as PMTiles on Cloudflare R2

**Status** Accepted. Implemented in PRs #73 and #74. PR #100 selected
the region used for the water trail.

## Context

NOAA publishes raster chart regions as MBTiles databases. The map
needs individual tiles as a boater pans and zooms. Packaging a regional
database with every Netlify deploy would add hundreds of megabytes.

## Decision

A weekly GitHub Actions job converts the selected region to PMTiles and
uploads it to R2. OpenLayers reads the public archive with HTTP byte
ranges. Netlify embeds the archive URL at build time.

## Consequences

Chart refreshes can run independently of site deploys. R2 must allow
range reads from the site's origins. The service worker caches tiles
from its host allowlist, so offline planning requires another basemap.
Region selection determines which stretches have chart detail.

See the [chart runbook](../plans/noaa-charts-pmtiles.md) for coverage,
configuration, alternatives and measurements.
