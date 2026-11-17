// Builds the Netlify `_redirects` file that maps every legacy
// ndwt.org URL onto this site. Pure: takes the site list, returns the
// file body. Served at build time by `app/%5Fredirects/route.ts`.
//
// Netlify processes rules top to bottom and stops at the first match,
// so specific rules come before section catch-alls, and the global
// `/ndwt/*` catch-all is last.
//
// Per-site URLs: the old site used `/ndwt/explore/site.asp?site=<id>`.
// Netlify can capture a query value into a placeholder (`site=:id`)
// but doesn't document matching on an exact value, so a single hop to
// `/sites/<slug>/` isn't possible. Instead:
//   hop 1: /ndwt/explore/site.asp?site=130 → /sites/legacy/130/
//   hop 2: /sites/legacy/130/              → /sites/blalock-canyon/
// Both are 301s. Search engines follow short chains fine, and an
// unknown id falls through to the site index instead of a 404.

import { allStaticRoutes, EDITORIAL_SECTIONS, sitePath } from './site-routes';

export interface LegacySite {
  readonly slug: string;
  /**
   * Original ndwt.org URL, e.g.
   * `http://www.ndwt.org/ndwt/explore/site.asp?site=130`.
   */
  readonly sourceUrl?: string;
}

const LEGACY_SITE_PATH = '/ndwt/explore/site.asp';
const LEGACY_SITE_HOP = '/sites/legacy';

/** Extract the numeric `site=` id from a legacy ndwt.org site URL. */
export const legacySiteId = (sourceUrl: string): string | undefined => {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return undefined;
  }
  if (url.pathname.toLowerCase() !== LEGACY_SITE_PATH) return undefined;
  const id = url.searchParams.get('site');
  return id !== null && /^\d+$/.test(id) ? id : undefined;
};

/** Format one permanent-redirect line for `_redirects`. */
const rule = (from: string, to: string): string => `${from}  ${to}  301`;

/**
 * Render the full `_redirects` body: per-site hops, editorial pages,
 * section catch-alls, then the global `/ndwt/*` fallback.
 */
export const buildRedirects = (sites: readonly LegacySite[]): string => {
  const lines: string[] = [
    '# Generated at build time by app/%5Fredirects/route.ts.',
    '# Do not edit out/_redirects by hand; change src/lib/legacy-redirects.ts.',
    '',
    '# Legacy per-site pages (two hops; see legacy-redirects.ts).',
    rule(`${LEGACY_SITE_PATH} site=:id`, `${LEGACY_SITE_HOP}/:id/`),
  ];

  const seen = new Set<string>();
  for (const site of sites) {
    if (site.sourceUrl === undefined) continue;
    const id = legacySiteId(site.sourceUrl);
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    lines.push(rule(`${LEGACY_SITE_HOP}/${id}/`, sitePath(site.slug)));
  }
  lines.push(
    rule(`${LEGACY_SITE_HOP}/*`, '/sites/'),
    rule(LEGACY_SITE_PATH, '/sites/'),
    '',
    '# Legacy editorial pages.'
  );

  for (const route of allStaticRoutes()) {
    if (route.legacyPath !== undefined) {
      lines.push(rule(route.legacyPath, route.path));
    }
  }

  lines.push('', '# Legacy section catch-alls.');
  for (const section of EDITORIAL_SECTIONS) {
    lines.push(rule(`${section.legacyDir}/*`, `/${section.segment}/`));
  }
  lines.push(
    rule('/ndwt/explore/*', '/sites/'),
    rule('/ndwt/about/*', '/about/'),
    '',
    '# Everything else from the old site goes to the map.',
    rule('/ndwt/*', '/'),
    rule('/default.asp', '/'),
    ''
  );

  return lines.join('\n');
};
