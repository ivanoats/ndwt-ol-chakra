# Recreation.gov site-info enrichment (research + plan)

## Why this exists

Issue request: evaluate whether Recreation.gov can provide additional
site metadata for NDWT launch locations, then define a low-risk plan.

## Research summary

Based on Recreation.gov's RIDB developer docs and use/share pages:

- RIDB exposes an API at `https://ridb.recreation.gov/api/v1` with
  endpoints for facilities, recreation areas, campsites, media, and
  related entities.
- Access requires an API key obtained via RIDB registration.
- Recreation.gov encourages API use for downstream apps; scraping
  HTML pages is not the right integration path when API data exists.
- RIDB appears to provide fields that can enrich site pages:
  facility names/descriptions, directions, contact data, map/reservation
  URLs, and fee-oriented fields.

Sources:

- <https://ridb.recreation.gov/docs>
- <https://ridb.recreation.gov/shared/swagger/ridb.yaml>
- <https://ridb.recreation.gov/?action=register>
- <https://www.recreation.gov/use-our-data>
- <https://ridb.recreation.gov/access-agreement-ridb>

## Fit with current NDWT model

Current `Site` fields already support several likely RIDB values:

- `name`, `contact`, `phone`, `website`, `campingFee`, `notes`
- `coordinates` (for geospatial matching)

Likely new optional fields if we adopt RIDB enrichment:

- `recreationGovFacilityId?: string`
- `recreationGovUrl?: string` (or reuse `website` with provenance notes)
- `directions?: string`
- `managingAgency?: string`
- `reservationRequired?: boolean` (only if source data is reliable)

## Proposed implementation plan

### Phase A — feasibility spike (no runtime changes)

1. Add a one-shot script `scripts/research-ridb-matches.ts` to:
   - query candidate RIDB facilities by bounding box/state keywords
   - score matches against NDWT `name` + coordinate proximity
   - emit a review artifact under `/tmp` and a curated JSON file
2. Keep this out of the build. Manual run only, same as prior
   enrichment scripts.
3. Validate at least 20 random records manually before any merge.

### Phase B — optional dataset enrichment

1. Add reviewed fields into `public/data/ndwt.geojson` properties.
2. Extend parser (`parseSitesFromGeoJson`) and `Site` type with only
   fields we will actually render.
3. Update `public/data/README.md` and `NOTICE.md` provenance text.

### Phase C — UI usage

1. In `SiteDetails`, render new rows only when present.
2. Prefer links to official Recreation.gov facility pages when useful.
3. Add tests for parser + conditional panel rows.

## Guardrails

- Do not scrape Recreation.gov HTML for production data.
- Keep enrichment one-shot and reviewable (committed dataset changes).
- Preserve existing WWTA/ndwt.org provenance; add Recreation.gov
  provenance explicitly for any adopted fields.
- Prefer additive schema changes only (no field removals/renames).
