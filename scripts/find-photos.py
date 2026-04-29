#!/usr/bin/env python3
"""
Find candidate photos for each Northwest Discovery Water Trail
site by searching geographic photo sources for material near
the site's lat/lon.

Currently queries:

- Wikimedia Commons (https://commons.wikimedia.org/) — explicit
  license metadata, geocoded images. The cleanest source for
  reuse since every result advertises its license terms.

Reads:
  public/data/ndwt.geojson

Writes:
  public/data/photo-candidates.json — one entry per site, each
  entry has an array of candidates with source / url /
  thumbnail / page_url / title / photographer / license /
  license_url / dist_m.

Run from the repo root:
  python3 scripts/find-photos.py            # all 159 sites
  python3 scripts/find-photos.py --limit 5  # smoke-test mode
  python3 scripts/find-photos.py --radius 8000  # 8 km radius

Standard library only — no pip install needed. The earlier
`requests`-based starter has been folded into this script. Honors
a small request throttle (350 ms) so we don't hammer the
Wikimedia API.

Future sources to plug in (each is a separate function that
returns a list of candidate dicts and gets called from
`find_candidates`):

- Flickr CC-licensed search:
    https://www.flickr.com/services/api/flickr.photos.search.html
    needs a FLICKR_API_KEY env var; license=4,5,6,7,9,10 are
    Creative Commons / public domain.
- WWTA NextGen Gallery (the maintainer has admin access):
    expose images via the NextGen Gallery REST endpoint, then
    correlate to sites by album name or filename. No geocoding
    on the WordPress side, so association is by hand or by
    fuzzy text matching against site names.
- Mapillary street-level imagery:
    https://www.mapillary.com/developer/api-documentation/
    great for boat-ramp parking / road-approach shots; needs an
    OAuth token.
- USGS / NPS public-domain photo libraries:
    https://www.usgs.gov/news/multimedia-gallery
    https://www.nps.gov/aboutus/multimedia.htm
    no geocoded REST endpoint; would need site-name keyword
    matching against their search APIs.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
GEOJSON_PATH = REPO_ROOT / "public" / "data" / "ndwt.geojson"
OUTPUT_PATH = REPO_ROOT / "public" / "data" / "photo-candidates.json"

REQUEST_DELAY_S = 0.35  # ~3 req/s — well under Wikimedia's 200/min limit
USER_AGENT = (
    "ndwt-ol-chakra photo-candidate scraper "
    "(+https://github.com/ivanoats/ndwt-ol-chakra; authorized by WWTA)"
)

# Commons-compatible licenses we'll keep. Anything else
# (proprietary, all-rights-reserved, or unverifiable) is filtered
# out. Match by prefix because Commons reports specific variants
# like "CC BY-SA 4.0" / "CC BY 2.5" / "CC0".
ACCEPTABLE_LICENSE_PREFIXES: tuple[str, ...] = (
    "CC0",
    "CC BY",  # CC BY, CC BY-SA, CC BY 2.0, etc.
    "Public domain",
    "PD",
)

# Title prefixes / patterns that indicate orbital or aerial
# imagery — geocoded at the lat/lon but useless for "ground-level
# photo of this site". Filter them out so the candidate list
# isn't drowned in NASA Earth-observation shots and USGS
# orthophoto tiles. The match is case-insensitive on the bare
# title (after the "File:" prefix is stripped).
SKIP_TITLE_PREFIXES: tuple[str, ...] = (
    "ISS",  # International Space Station Earth-observation imagery
    "STS",  # Space Shuttle missions
    "Earth-",
    "Landsat",
    "Sentinel-",
    "MOD",  # MODIS satellite tiles
    "Apollo",
)
SKIP_FILENAME_PATTERNS: tuple[str, ...] = (
    " - View of Earth",
    "satellite image",
    "from space",
    "orthophoto",
)
# USGS aerial-photo tiles use a `M_<digits>_<quad>` naming pattern
# (e.g. "M 4512022 nw 10 060 20210709.tif"). Skip TIFs entirely
# unless we've got a reason to keep them.
SKIP_MIME_TYPES: tuple[str, ...] = ("image/tiff",)


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------


def http_get_json(url: str, params: dict[str, str | int]) -> dict[str, Any]:
    """GET a JSON endpoint with the project's User-Agent."""
    full = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Wikimedia Commons
# ---------------------------------------------------------------------------


COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def commons_geosearch(
    lat: float, lon: float, radius_m: int, limit: int = 10
) -> list[dict[str, Any]]:
    """
    Find File: pages within `radius_m` of the given coords. Returns
    raw geosearch result dicts: {pageid, ns, title, lat, lon, dist}.

    Wikimedia caps `gsradius` at 10000 — anything larger is
    silently treated as 10000.
    """
    payload = http_get_json(
        COMMONS_API,
        {
            "action": "query",
            "format": "json",
            "list": "geosearch",
            "gscoord": f"{lat}|{lon}",
            "gsradius": min(radius_m, 10_000),
            "gsnamespace": 6,  # File:
            "gslimit": limit,
        },
    )
    return payload.get("query", {}).get("geosearch", [])


def commons_imageinfo(titles: list[str]) -> dict[str, dict[str, Any]]:
    """
    For each File: title, fetch the imageinfo block (URL, mime,
    extmetadata for license + author). Returns dict keyed by
    title. Wikimedia accepts up to 50 titles per query — chunk if
    needed.
    """
    if not titles:
        return {}
    out: dict[str, dict[str, Any]] = {}
    for chunk_start in range(0, len(titles), 50):
        chunk = titles[chunk_start : chunk_start + 50]
        payload = http_get_json(
            COMMONS_API,
            {
                "action": "query",
                "format": "json",
                "prop": "imageinfo",
                "iiprop": "url|mime|extmetadata",
                "iiurlwidth": 800,
                "titles": "|".join(chunk),
            },
        )
        for page in payload.get("query", {}).get("pages", {}).values():
            title = page.get("title")
            info_list = page.get("imageinfo") or []
            if title and info_list:
                out[title] = info_list[0]
        time.sleep(REQUEST_DELAY_S)
    return out


def extract_license(extmeta: dict[str, Any]) -> tuple[str | None, str | None]:
    """Pull `LicenseShortName` and `LicenseUrl` out of extmetadata."""
    short = (extmeta.get("LicenseShortName") or {}).get("value")
    url = (extmeta.get("LicenseUrl") or {}).get("value")
    return short, url


class _TagStripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.buf: list[str] = []

    def handle_data(self, data: str) -> None:
        self.buf.append(data)


def extract_artist(extmeta: dict[str, Any]) -> str | None:
    """
    Pull `Artist` (HTML) and strip tags. Falls back to `Credit`.
    Commons embeds <a>, <span>, etc. in these fields — strip them
    so the JSON output is plain text.
    """
    raw = (extmeta.get("Artist") or {}).get("value") or (
        extmeta.get("Credit") or {}
    ).get("value")
    if not raw:
        return None
    stripper = _TagStripper()
    stripper.feed(raw)
    return " ".join("".join(stripper.buf).split()) or None


def license_acceptable(short: str | None) -> bool:
    if not short:
        return False
    return any(short.startswith(prefix) for prefix in ACCEPTABLE_LICENSE_PREFIXES)


def title_relevant(bare_title: str, mime: str | None) -> bool:
    """
    Heuristic filter to drop obvious satellite / aerial imagery.
    Wikimedia's geosearch indexes those at their nadir lat/lon, so
    they pollute the candidate list for ground-level photo
    queries. Tighten / loosen as needed.
    """
    lower = bare_title.lower()
    if mime in SKIP_MIME_TYPES:
        return False
    for prefix in SKIP_TITLE_PREFIXES:
        if bare_title.startswith(prefix):
            return False
    for needle in SKIP_FILENAME_PATTERNS:
        if needle in lower:
            return False
    return True


def commons_candidates_for(
    lat: float, lon: float, radius_m: int
) -> list[dict[str, Any]]:
    """
    End-to-end: geosearch → imageinfo → filter to acceptable
    licenses → return candidate dicts.
    """
    hits = commons_geosearch(lat, lon, radius_m)
    if not hits:
        return []

    titles = [h["title"] for h in hits]
    info_by_title = commons_imageinfo(titles)

    candidates: list[dict[str, Any]] = []
    for hit in hits:
        title = hit["title"]
        info = info_by_title.get(title)
        if info is None:
            continue
        extmeta = info.get("extmetadata") or {}
        license_short, license_url = extract_license(extmeta)
        if not license_acceptable(license_short):
            continue
        bare_title = title.removeprefix("File:")
        if not title_relevant(bare_title, info.get("mime")):
            continue
        candidates.append(
            {
                "source": "wikimedia-commons",
                "title": bare_title,
                "url": info.get("url"),
                "thumb_url": info.get("thumburl"),
                "page_url": info.get("descriptionurl"),
                "mime": info.get("mime"),
                "photographer": extract_artist(extmeta),
                "license": license_short,
                "license_url": license_url,
                "dist_m": hit.get("dist"),
            }
        )
    return candidates


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------


def read_sites(path: Path) -> list[dict[str, Any]]:
    """Read GeoJSON and project to a flat list of {id, name, lat, lon}."""
    data = json.loads(path.read_text(encoding="utf-8"))
    sites = []
    for feat in data.get("features", []):
        props = feat.get("properties", {})
        site_id = props.get("web-scraper-order")
        coords = (feat.get("geometry") or {}).get("coordinates") or []
        if not site_id or len(coords) != 2:
            continue
        lon, lat = coords  # GeoJSON is [lng, lat]
        sites.append(
            {
                "id": site_id,
                "name": props.get("name"),
                "river": props.get("riverName"),
                "mile": props.get("riverMile"),
                "lat": lat,
                "lon": lon,
            }
        )
    return sites


def find_candidates(
    site: dict[str, Any], radius_m: int
) -> list[dict[str, Any]]:
    """
    Aggregate candidates from every source. Currently just
    Wikimedia Commons; extension hook here for Flickr / WWTA /
    Mapillary / etc.
    """
    out: list[dict[str, Any]] = []
    out.extend(commons_candidates_for(site["lat"], site["lon"], radius_m))
    # TODO: out.extend(flickr_candidates_for(...))
    # TODO: out.extend(wwta_gallery_candidates_for(...))
    return out


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="only process the first N sites (smoke-test mode)",
    )
    parser.add_argument(
        "--radius",
        type=int,
        default=5_000,
        help="geosearch radius in meters (default 5000, max 10000)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help="output JSON path",
    )
    args = parser.parse_args()

    sites = read_sites(GEOJSON_PATH)
    if args.limit is not None:
        sites = sites[: args.limit]
    print(
        f"Scanning {len(sites)} site(s) within {args.radius}m for "
        "candidate photos…",
        file=sys.stderr,
    )

    results: list[dict[str, Any]] = []
    for index, site in enumerate(sites, start=1):
        print(
            f"  [{index}/{len(sites)}] {site['name'] or site['id']} "
            f"({site['lat']:.4f},{site['lon']:.4f})",
            file=sys.stderr,
        )
        try:
            candidates = find_candidates(site, args.radius)
        except (urllib.error.URLError, ValueError) as exc:
            print(f"    ! error: {exc}", file=sys.stderr)
            candidates = []
        results.append(
            {
                "site_id": site["id"],
                "site_name": site["name"],
                "river": site["river"],
                "mile": site["mile"],
                "lat": site["lat"],
                "lon": site["lon"],
                "candidates": candidates,
            }
        )
        time.sleep(REQUEST_DELAY_S)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    total = sum(len(r["candidates"]) for r in results)
    with_any = sum(1 for r in results if r["candidates"])
    try:
        display_path: Path | str = args.output.relative_to(REPO_ROOT)
    except ValueError:
        # `--output` was outside the repo (e.g. /tmp during smoke
        # tests). Show the absolute path instead of crashing.
        display_path = args.output
    print(
        f"\nWrote {display_path}\n"
        f"  sites processed: {len(results)}\n"
        f"  sites with at least 1 candidate: {with_any}\n"
        f"  total candidates: {total}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
