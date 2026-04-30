#!/usr/bin/env python3
"""
Find candidate photos for each Northwest Discovery Water Trail
site by searching geographic photo sources for material near
the site's lat/lon.

Currently queries:

- Wikimedia Commons (https://commons.wikimedia.org/) — explicit
  license metadata, geocoded images. The cleanest source for
  reuse since every result advertises its license terms.
- WWTA WordPress NextGen Gallery (https://www.wwta.org/) —
  fuzzy site-name → album-name match. Skipped when no auth is
  configured. WP Application Passwords are stored in macOS
  Keychain; see the WWTA section below.

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
- WWTA NextGen Gallery: now stubbed; see
  `wwta_gallery_candidates_for`. Auth lives in macOS Keychain
  (service `wwta-wp-app-password`, account = WP username).
  The response shape needs confirmation against a live admin
  call — once we see real JSON the function may need a small
  field-name adjustment.
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
import base64
import json
import os
import subprocess
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
    " - view of earth",
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
        if lower.startswith(prefix.lower()):
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
# WWTA WordPress (NextGen Gallery)
# ---------------------------------------------------------------------------
#
# Authenticated via macOS Keychain or env-var fallback. Store the
# WordPress Application Password (https://make.wordpress.org/core/
# 2020/11/05/application-passwords-integration-guide/) once with:
#
#     security add-generic-password -U -a YOUR-WP-USERNAME \
#         -s wwta-wp-app-password -w
#
# (omit `-w VALUE` so `security` prompts without echoing). The
# script reads the username from `--wwta-user` or `WWTA_WP_USER`,
# then asks Keychain for the matching password under service
# `wwta-wp-app-password`. If Keychain isn't available (Linux CI,
# etc.) it falls back to `WWTA_WP_APP_PASSWORD`.
#
# Skipped silently when no credentials are configured — the
# Wikimedia source still runs.


WWTA_API_BASE = "https://www.wwta.org/wp-json"
WWTA_KEYCHAIN_SERVICE = "wwta-wp-app-password"


def keychain_password(account: str, service: str) -> str | None:
    """Look up a password in the macOS keychain via /usr/bin/security."""
    if sys.platform != "darwin":
        return None
    try:
        result = subprocess.run(
            ["security", "find-generic-password", "-a", account, "-s", service, "-w"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def wwta_credentials(user_override: str | None = None) -> tuple[str, str] | None:
    """
    Resolve (username, app_password) for WWTA's WordPress.
    Returns None if either piece is missing.
    """
    user = user_override or os.environ.get("WWTA_WP_USER")
    if not user:
        return None
    password = keychain_password(user, WWTA_KEYCHAIN_SERVICE)
    if password is None:
        password = os.environ.get("WWTA_WP_APP_PASSWORD")
    if not password:
        return None
    # WP application passwords are typically displayed with spaces
    # ("xxxx xxxx xxxx ..."). Strip those — the API doesn't care
    # but Basic auth gets cleaner without them.
    return user, password.replace(" ", "")


def http_get_json_basic_auth(
    url: str, params: dict[str, str | int], user: str, password: str
) -> dict[str, Any]:
    """Like http_get_json but with HTTP Basic auth bolted on."""
    full = f"{url}?{urllib.parse.urlencode(params)}" if params else url
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    req = urllib.request.Request(
        full,
        headers={
            "User-Agent": USER_AGENT,
            "Authorization": f"Basic {token}",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _normalize_for_match(name: str) -> str:
    """Lowercase, alnum-only — for fuzzy site-name to album-name match."""
    return "".join(ch for ch in name.lower() if ch.isalnum())


def fetch_wwta_gallery_list(
    user: str, password: str
) -> list[dict[str, Any]] | None:
    """
    Fetch the full WWTA NextGen Gallery list once per run.
    Returns the normalised list on success, or None on error.
    """
    try:
        galleries_response = http_get_json_basic_auth(
            f"{WWTA_API_BASE}/ngg/v1/admin/attach_to_post/galleries",
            {},
            user,
            password,
        )
    except urllib.error.URLError as exc:
        print(f"    ! wwta gallery list error: {exc}", file=sys.stderr)
        return None
    time.sleep(REQUEST_DELAY_S)

    # The endpoint may return a list, or {results: [...]}, or a
    # paginated dict. Normalize.
    if isinstance(galleries_response, list):
        return galleries_response
    if isinstance(galleries_response, dict):
        return (
            galleries_response.get("results")
            or galleries_response.get("galleries")
            or galleries_response.get("data")
            or []
        )
    return []


def wwta_gallery_candidates_for(
    site: dict[str, Any],
    galleries: list[dict[str, Any]],
    user: str,
    password: str,
) -> list[dict[str, Any]]:
    """
    Match WWTA NextGen Gallery albums/galleries to a site by name
    (no geocoding on the WordPress side, so this is the only
    correlation we have). Each matched gallery's images become
    candidates.

    ``galleries`` must be the pre-fetched list returned by
    :func:`fetch_wwta_gallery_list` so the remote API is only
    called once per run, not once per site.

    SHAPE NOTE: this targets the routes visible at
    /wp-json/ngg/v1/admin/attach_to_post/{galleries,images}, which
    are admin helpers exposed by NextGen Gallery's REST plugin.
    The actual response shape needs confirmation against a live
    auth call — once we see the JSON, this function will need a
    minor adjustment (key names like `name`, `title`, `gid`,
    `image_url` may differ). Until then it logs unrecognized
    shapes to stderr and returns [].
    """
    site_name = site.get("name") or ""
    if not site_name:
        return []

    site_norm = _normalize_for_match(site_name)
    if not site_norm:
        return []

    candidates: list[dict[str, Any]] = []
    for gallery in galleries:
        if not isinstance(gallery, dict):
            continue
        gallery_name = (
            gallery.get("name")
            or gallery.get("title")
            or gallery.get("slug")
            or ""
        )
        if _normalize_for_match(gallery_name) != site_norm and site_norm not in _normalize_for_match(
            gallery_name
        ):
            continue
        gid = gallery.get("gid") or gallery.get("id") or gallery.get("ID")
        if gid is None:
            continue
        try:
            images_response = http_get_json_basic_auth(
                f"{WWTA_API_BASE}/ngg/v1/admin/attach_to_post/images",
                {"gallery": gid},
                user,
                password,
            )
        except urllib.error.URLError as exc:
            print(f"    ! wwta gallery {gid} images error: {exc}", file=sys.stderr)
            continue
        time.sleep(REQUEST_DELAY_S)

        if isinstance(images_response, list):
            images = images_response
        elif isinstance(images_response, dict):
            images = (
                images_response.get("results")
                or images_response.get("images")
                or images_response.get("data")
                or []
            )
        else:
            continue

        for image in images:
            if not isinstance(image, dict):
                continue
            url = (
                image.get("image_url")
                or image.get("imageURL")
                or image.get("url")
                or image.get("full_url")
            )
            if not url:
                continue
            candidates.append(
                {
                    "source": "wwta-wordpress-nextgen",
                    "title": image.get("alttext")
                    or image.get("title")
                    or image.get("filename")
                    or "",
                    "url": url,
                    "thumb_url": image.get("thumbURL")
                    or image.get("thumb_url"),
                    "page_url": gallery.get("page_url"),
                    "mime": "image/jpeg",  # NextGen mostly stores JPEGs
                    "photographer": image.get("description")
                    or image.get("alttext"),
                    # WWTA-managed photos fall under the same
                    # Executive-Director permission grant recorded in
                    # NOTICE.md. Confirm per-photo before publishing.
                    "license": "WWTA permission (per NOTICE.md)",
                    "license_url": None,
                    "dist_m": None,
                    "matched_gallery": gallery_name,
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
    site: dict[str, Any],
    radius_m: int,
    wwta_galleries: list[dict[str, Any]] | None = None,
    wwta_user: str = "",
    wwta_password: str = "",
) -> list[dict[str, Any]]:
    """
    Aggregate candidates from every source. Currently just
    Wikimedia Commons; extension hook here for Flickr / WWTA /
    Mapillary / etc.
    """
    out: list[dict[str, Any]] = []
    out.extend(commons_candidates_for(site["lat"], site["lon"], radius_m))
    if wwta_galleries is not None and wwta_user and wwta_password:
        out.extend(
            wwta_gallery_candidates_for(site, wwta_galleries, wwta_user, wwta_password)
        )
    # TODO: out.extend(flickr_candidates_for(...))
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
    parser.add_argument(
        "--wwta-user",
        default=None,
        metavar="USERNAME",
        help=(
            "WordPress username for WWTA authentication "
            "(overrides WWTA_WP_USER env var)"
        ),
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

    # Fetch WWTA gallery list once so every site reuses the same data.
    wwta_galleries: list[dict[str, Any]] | None = None
    wwta_user_val = ""
    wwta_password_val = ""
    creds = wwta_credentials(user_override=args.wwta_user)
    if creds is not None:
        wwta_user_val, wwta_password_val = creds
        print("Fetching WWTA gallery list…", file=sys.stderr)
        wwta_galleries = fetch_wwta_gallery_list(wwta_user_val, wwta_password_val)
        if wwta_galleries is None:
            print("  ! WWTA gallery list unavailable; skipping WWTA source.", file=sys.stderr)
            wwta_galleries = None

    results: list[dict[str, Any]] = []
    for index, site in enumerate(sites, start=1):
        print(
            f"  [{index}/{len(sites)}] {site['name'] or site['id']} "
            f"({site['lat']:.4f},{site['lon']:.4f})",
            file=sys.stderr,
        )
        try:
            candidates = find_candidates(
                site,
                args.radius,
                wwta_galleries=wwta_galleries,
                wwta_user=wwta_user_val,
                wwta_password=wwta_password_val,
            )
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
