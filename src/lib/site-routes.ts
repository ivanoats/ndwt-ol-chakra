// Single manifest of every public, non-site route on the site, plus
// the legacy ndwt.org URL each one replaces. Consumed by
// `app/sitemap.ts` and the generated Netlify `_redirects` file.
//
// The editorial section pages keep their own title/summary tables
// next to their MDX imports; this file only carries paths. A unit
// test (`__tests__/site-routes.test.ts`) cross-checks this manifest
// against `app/**/page.tsx` and `content/**/*.mdx` so a new page
// can't ship without a sitemap entry.
//
// All paths use a trailing slash to match `trailingSlash: true` in
// next.config.mjs, so sitemap URLs are the canonical, non-redirecting
// form.

export interface StaticRoute {
  /** Site-relative path, leading and trailing slash. */
  readonly path: string;
  /** Legacy ndwt.org path (no host) that should 301 here, if any. */
  readonly legacyPath?: string;
}

/** Top-level and standalone pages (one `page.tsx` each). */
export const STANDALONE_ROUTES: readonly StaticRoute[] = [
  { path: '/' },
  { path: '/sites/' },
  { path: '/trip-planning/' },
  { path: '/leave-no-trace/', legacyPath: '/ndwt/explore/lnt.asp' },
  { path: '/about/' },
  { path: '/about/history/', legacyPath: '/ndwt/about/history.asp' },
  { path: '/about/partners/', legacyPath: '/ndwt/about/partners.asp' },
  { path: '/about/contact/' },
  { path: '/about/photo-gallery/' },
  { path: '/get-involved/' },
];

export interface EditorialSection {
  /** Route segment under `app/<segment>/[[...slug]]`. */
  readonly segment: string;
  /** Legacy ndwt.org directory for this section, e.g. `/ndwt/water_safety`. */
  readonly legacyDir: string;
  /** Sub-page slug → legacy `.asp` filename inside `legacyDir`. */
  readonly pages: Readonly<Record<string, string>>;
}

// Legacy filenames come from the attribution link in each MDX file
// (the ndwt.org URL the copy was taken from).
export const EDITORIAL_SECTIONS: readonly EditorialSection[] = [
  {
    segment: 'water-safety',
    legacyDir: '/ndwt/water_safety',
    pages: {
      weather: 'weather.asp',
      'barge-traffic': 'barge_traffic.asp',
      communications: 'communications.asp',
      'reading-the-rivers': 'reading_rivers.asp',
      'float-plans': 'float_plans.asp',
      'safety-gear': 'safety_gear.asp',
    },
  },
  {
    segment: 'river-navigation',
    legacyDir: '/ndwt/navigation',
    pages: {
      'lock-and-dam': 'dam_protocol.asp',
      'portage-guide': 'portage_guide.asp',
    },
  },
  {
    segment: 'natural-world',
    legacyDir: '/ndwt/natural_world',
    pages: {
      'flora-fauna': 'flora_fauna.asp',
      geology: 'geology.asp',
      'invasive-species': 'invasive_species.asp',
    },
  },
  {
    segment: 'past-and-present',
    legacyDir: '/ndwt/past_present',
    pages: {
      'tribal-communities': 'communities.asp',
      'early-explorers': 'early_explorers.asp',
      'trade-and-industry': 'trade_industry.asp',
    },
  },
];

/** Every editorial route: each section index plus its sub-pages. */
export const editorialRoutes = (): readonly StaticRoute[] =>
  EDITORIAL_SECTIONS.flatMap((section) => [
    { path: `/${section.segment}/` },
    ...Object.entries(section.pages).map(([slug, legacyFile]) => ({
      path: `/${section.segment}/${slug}/`,
      legacyPath: `${section.legacyDir}/${legacyFile}`,
    })),
  ]);

/** All non-site routes, standalone first, in sitemap order. */
export const allStaticRoutes = (): readonly StaticRoute[] => [
  ...STANDALONE_ROUTES,
  ...editorialRoutes(),
];

export const sitePath = (slug: string): string => `/sites/${slug}/`;
