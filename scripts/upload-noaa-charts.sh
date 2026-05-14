#!/usr/bin/env bash
# Manual one-shot upload of a NOAA NCDS PMTiles archive to Cloudflare R2.
#
# Use this when:
#   - First-time bootstrap of the R2 bucket
#   - Testing an out-of-cadence refresh
#   - The scheduled GitHub Actions workflow is broken and you need to
#     unblock production quickly
#
# Normal weekly refreshes run from .github/workflows/refresh-noaa-charts.yml.
#
# Prerequisites:
#   - `pmtiles` CLI installed: `brew install pmtiles` (macOS) or download
#     a release binary from https://github.com/protomaps/go-pmtiles/releases
#   - `aws` CLI installed: `brew install awscli`
#   - These environment variables exported in your shell:
#       R2_ACCESS_KEY_ID
#       R2_SECRET_ACCESS_KEY
#       R2_ENDPOINT_URL         e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
#       R2_BUCKET               e.g. wwta
#
# Usage:
#   ./scripts/upload-noaa-charts.sh [region]
#
# Defaults to region ncds_20c (Puget Sound). Pass any NCDS region name
# (e.g. ncds_20b for the north Salish Sea + San Juans) as the first arg
# to refresh a different region. The region list is at
# https://distribution.charts.noaa.gov/ncds/index.html.
#
# Output ends up at s3://${R2_BUCKET}/charts/<region>.pmtiles.

set -euo pipefail

region="${1:-ncds_20c}"
workdir="$(mktemp -d -t noaa-pmtiles-XXXXXX)"
trap 'rm -rf "${workdir}"' EXIT

# Sanity-check the environment up front so we fail fast (the actual
# upload only happens after a ~30 MB download + a multi-second
# conversion, and a missed env var would waste that time).
for var in R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT_URL R2_BUCKET; do
  if [ -z "${!var:-}" ]; then
    echo "Error: ${var} is not set. See the header of this script." >&2
    exit 1
  fi
done

command -v pmtiles >/dev/null 2>&1 || {
  echo "Error: pmtiles CLI not found. Run: brew install pmtiles" >&2
  exit 1
}
command -v aws >/dev/null 2>&1 || {
  echo "Error: aws CLI not found. Run: brew install awscli" >&2
  exit 1
}

echo "Working directory: ${workdir}"
cd "${workdir}"

echo "[1/3] Downloading ${region}.mbtiles from NOAA..."
curl -sSL --fail --max-time 600 -o "${region}.mbtiles" \
  "https://distribution.charts.noaa.gov/ncds/mbtiles/${region}.mbtiles"
ls -lh "${region}.mbtiles"

echo "[2/3] Converting to PMTiles..."
pmtiles convert "${region}.mbtiles" "${region}.pmtiles"
ls -lh "${region}.pmtiles"

echo "[3/3] Uploading to s3://${R2_BUCKET}/charts/${region}.pmtiles..."
AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
AWS_REGION="auto" \
AWS_DEFAULT_REGION="auto" \
AWS_EC2_METADATA_DISABLED="true" \
aws s3 cp \
  "${region}.pmtiles" \
  "s3://${R2_BUCKET}/charts/${region}.pmtiles" \
  --endpoint-url "${R2_ENDPOINT_URL}" \
  --content-type "application/vnd.pmtiles"

echo
echo "Done. The PMTiles archive is now at:"
echo "  s3://${R2_BUCKET}/charts/${region}.pmtiles"
echo
echo "Production reads from NEXT_PUBLIC_NOAA_CHARTS_URL — make sure"
echo "that env var in Netlify points at the public-read URL for this"
echo "object (the bucket's r2.dev URL or your custom domain)."
