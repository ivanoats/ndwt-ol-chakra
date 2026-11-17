import type { Metadata } from 'next';

// One place to build a page's <head> metadata: title, description,
// canonical URL, OpenGraph, and Twitter card.
//
// Why a helper instead of defaults in app/layout.tsx: Next merges
// metadata shallowly, so a page that sets `openGraph` at all replaces
// the layout's whole `openGraph` object (losing siteName, images,
// etc.). Building the full object per page keeps every route's
// share card complete.
//
// Paths are site-relative; `metadataBase` in app/layout.tsx turns
// them into absolute URLs at build time.

export const SITE_NAME = 'Northwest Discovery Water Trail';

export const SITE_DESCRIPTION =
  'A 367-mile recreational boating route on the Snake, Columbia, and ' +
  'Clearwater rivers — Canoe Camp to Bonneville Dam.';

// The square PWA icon doubles as the share image. A summary card
// (small square thumbnail) suits it; a 1200x630 hero image would be
// needed for `summary_large_image`.
const SHARE_IMAGE = {
  url: '/icon-512.png',
  width: 512,
  height: 512,
  alt: `${SITE_NAME} logo`,
} as const;

export interface PageMetadataInput {
  /**
   * Page-specific title, without the site name (e.g. "Weather — Water
   * Safety"). Omit for the home page.
   */
  readonly title?: string;
  readonly description: string;
  /** Site-relative canonical path with trailing slash, e.g. `/sites/`. */
  readonly path: string;
  readonly type?: 'website' | 'article';
}

export const pageMetadata = ({
  title,
  description,
  path,
  type = 'website',
}: PageMetadataInput): Metadata => {
  const shareTitle = title ?? SITE_NAME;
  return {
    title: title === undefined ? SITE_NAME : `${title} — ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shareTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: 'en_US',
      type,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: 'summary',
      title: shareTitle,
      description,
      images: [SHARE_IMAGE.url],
    },
  };
};
