import type { MetadataRoute } from 'next';

import { loadSites } from '@/adapters/inbound/next/load-sites';
import { allStaticRoutes, sitePath } from '@/lib/site-routes';
import { absoluteUrl } from '@/lib/site-url';

export const dynamic = 'force-static';

// No `lastModified`: the build has no reliable per-page edit date,
// and a build-time timestamp on every URL tells crawlers nothing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sites = await loadSites();
  return [
    ...allStaticRoutes().map((route) => ({ url: absoluteUrl(route.path) })),
    ...sites.map((site) => ({ url: absoluteUrl(sitePath(site.slug)) })),
  ];
}
