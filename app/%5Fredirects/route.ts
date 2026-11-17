// Emits Netlify's `_redirects` file into the static export (`out/_redirects`).
//
// The folder is named `%5Fredirects` because App Router treats any
// folder starting with `_` as private (not routed); `%5F` is the
// URL-encoded underscore Next documents for exactly this case.
// `force-static` makes `next build` render it once to a file.

import { loadSites } from '@/adapters/inbound/next/load-sites';
import { buildRedirects } from '@/lib/legacy-redirects';

export const dynamic = 'force-static';

/** Render the Netlify `_redirects` file from the site dataset. */
export async function GET(): Promise<Response> {
  const sites = await loadSites();
  return new Response(buildRedirects(sites), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
