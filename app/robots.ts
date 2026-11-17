import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site-url';

export const dynamic = 'force-static';

/** Allow all crawlers and point them at the absolute sitemap URL. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
