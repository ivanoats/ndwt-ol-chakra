# ADR 0005: NOAA charts at high zoom

- **Status:** Accepted (issue [#106](https://github.com/ivanoats/ndwt-ol-chakra/issues/106), 2026-11)
- **Deciders:** Ivan Storck

## Context

The NOAA Chart Display Service archive is sparse: coverage varies by
location and zoom, and some reaches are not charted. When a PMTiles
coordinate is absent, `ol-pmtiles` returns an empty byte array. The
OpenLayers canvas tile renderer cannot draw array data, so a missing
tile can interrupt rendering and leave the map apparently black in
dark mode. This is different from an archive that has no source
configured, a network failure, or an opaque but empty chart image.

## Decision

Keep the street map visible underneath the selected NOAA chart layer.
Adapt missing PMTiles entries into transparent canvas tiles so the
renderer can draw them and the underlying map remains visible. Keep
actual chart images and load errors unchanged. OpenLayers uses the
archive's zoom grid and enlarges its highest available tile above its
maximum zoom; no global view zoom limit is imposed.

## Alternatives considered

1. **Cap map zoom.** Simple and avoids magnifying charts, but prevents
   close inspection of markers and other basemaps and does not address
   sparse tiles below the cap.
2. **Overzoom chart tiles only.** Preserves chart appearance without
   another provider, but enlarged pixels add no detail and missing
   tiles within the archive's zoom range still need handling.
3. **Automatically switch to another basemap at a fixed zoom.** Offers
   consistent detail, but hides available charts at high zoom and a
   single cutoff cannot reflect variable chart coverage.
4. **Produce more complete, higher-resolution chart tiles.** Could add
   genuine nautical detail, but depends on available chart data and
   introduces processing, storage, and maintenance costs; no renderer
   can create nautical detail that NOAA does not supply.

## Consequences

- Users retain zoom and see chart data where it exists; absent or
  transparent tiles can reveal OSM, with its normal attribution.
- Enlarged charts can be blurry. OSM is not a nautical chart and does
  not supply missing chart information. Neither layer is for navigation.
- Opaque blank chart images can still cover the street map. The fallback
  also requires available or cached OSM tiles; it does not fix a failed
  NOAA archive request or extend NOAA coverage.
- The adapter relies on `ol-pmtiles` using an empty `Uint8Array` for
  missing entries. Recheck this compatibility when upgrading the library.
