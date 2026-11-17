// Absolute origin of the deployed site, used for `metadataBase`,
// the sitemap, and robots.txt. Resolved at build time (the site is a
// static export, so there is no runtime request to read a host from).
//
// Precedence:
//   1. `SITE_URL` — explicit override. Set this in Netlify once the
//      custom domain is live if you want canonical URLs pinned
//      regardless of which domain is primary.
//   2. `URL` — Netlify's build-time env var for the site's primary
//      URL. On deploy previews it is still the production URL, which
//      is what canonical/OpenGraph URLs should point at.
//   3. Localhost fallback for `next build` on a dev machine.

const FALLBACK_SITE_URL = 'http://localhost:3000';

export const resolveSiteUrl = (
  env: Readonly<Record<string, string | undefined>>
): string => {
  const candidates = [env.SITE_URL, env.URL];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (trimmed !== undefined && trimmed !== '') {
      // new URL() validates and normalizes; `.origin` drops any path
      // or trailing slash so callers can append paths safely.
      return new URL(trimmed).origin;
    }
  }
  return FALLBACK_SITE_URL;
};

export const SITE_URL = resolveSiteUrl(process.env);

/** Join a site-relative path (with leading slash) onto `SITE_URL`. */
export const absoluteUrl = (path: string, base: string = SITE_URL): string =>
  new URL(path, base).toString();
