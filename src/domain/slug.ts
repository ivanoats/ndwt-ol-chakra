/**
 * Pure slug derivation for per-site canonical URLs.
 *
 * Strategy is collision-aware in three tiers:
 *   1. `slugify(name)` if unique across the dataset.
 *   2. `slugify(name)-mile-{N}` (decimals as `2-5`) when names collide
 *      but river miles differ.
 *   3. `slugify(name)-{id}` as a final tiebreaker for true source
 *      duplicates (the legacy `web-scraper-order` value, which is
 *      unique by construction).
 *
 * Slug computation is a batch operation — it needs to see every site
 * to detect collisions. `assignSlugs` returns a Map keyed by id.
 */

export interface SluggableSite {
  readonly id: string;
  readonly name: string;
  readonly riverMile: number;
}

const baseSlug = (name: string): string => {
  // Lowercase, runs of non-alphanumerics collapsed to single dashes,
  // strip leading/trailing dash without anchored regex (avoids
  // Sonar S5852).
  const collapsed = name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
  const start = collapsed.startsWith('-') ? 1 : 0;
  const end = collapsed.length - (collapsed.endsWith('-') ? 1 : 0);
  const trimmed = collapsed.slice(start, end);
  return trimmed === '' ? 'site' : trimmed;
};

const withMile = (slug: string, mile: number): string =>
  `${slug}-mile-${`${mile}`.replaceAll('.', '-')}`;

const withId = (slug: string, id: string): string => `${slug}-${id}`;

/**
 * Compute the canonical slug for every site in `sites`. Returns a
 * Map<id, slug>. Pure: no I/O, no globals, deterministic for a given
 * input order.
 */
export const assignSlugs = (
  sites: readonly SluggableSite[]
): ReadonlyMap<string, string> => {
  // Pass 1: bucket by base slug.
  const buckets = new Map<string, SluggableSite[]>();
  for (const site of sites) {
    const key = baseSlug(site.name);
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [site]);
    else bucket.push(site);
  }

  const out = new Map<string, string>();

  for (const [base, bucket] of buckets) {
    if (bucket.length === 1) {
      // Single-iteration `for...of` reads the lone element without
      // an indexed access — sidesteps `noUncheckedIndexedAccess`'s
      // pessimism without a non-null assertion (DeepSource JS-0339)
      // or a dead-branch undefined check.
      for (const site of bucket) out.set(site.id, base);
      continue;
    }

    // Pass 2: try `name-mile-N`. Group within the bucket by the
    // mile-suffixed slug; if every entry lands on a unique slug,
    // we're done.
    const byMileSlug = new Map<string, SluggableSite[]>();
    for (const site of bucket) {
      const key = withMile(base, site.riverMile);
      const inner = byMileSlug.get(key);
      if (inner === undefined) byMileSlug.set(key, [site]);
      else inner.push(site);
    }

    for (const [mileSlug, inner] of byMileSlug) {
      if (inner.length === 1) {
        for (const site of inner) out.set(site.id, mileSlug);
      } else {
        // Pass 3: still colliding — append the legacy id. By
        // construction these ids are unique.
        for (const site of inner) {
          out.set(site.id, withId(mileSlug, site.id));
        }
      }
    }
  }

  return out;
};

export const __test = { baseSlug, withMile, withId };
