/**
 * Pure filter + sort helpers for the `/sites/` index page.
 *
 * Kept in the domain layer because they're framework-agnostic and
 * easy to unit test against fixtures. The UI layer (`SiteIndex`)
 * owns the input state via `useState` and pipes it through these
 * functions on every render.
 */

import type { Facility } from './facility';
import type { Site } from './site';

export type SiteSortMode = 'river-mile' | 'alpha';

export interface SiteFilter {
  readonly query: string;
  readonly river: string | null;
  readonly facilities: ReadonlySet<Facility>;
}

export const emptyFilter: SiteFilter = {
  query: '',
  river: null,
  facilities: new Set<Facility>(),
};

const matchesQuery = (site: Site, query: string): boolean => {
  if (query === '') return true;
  return site.name.toLowerCase().includes(query.toLowerCase());
};

const matchesRiver = (site: Site, river: string | null): boolean =>
  river === null || site.riverName === river;

const matchesFacilities = (
  site: Site,
  facilities: ReadonlySet<Facility>
): boolean => {
  if (facilities.size === 0) return true;
  for (const facility of facilities) {
    if (!site.facilities.includes(facility)) return false;
  }
  return true;
};

export const filterSites = (
  sites: readonly Site[],
  filter: SiteFilter
): readonly Site[] =>
  sites.filter(
    (site) =>
      matchesQuery(site, filter.query) &&
      matchesRiver(site, filter.river) &&
      matchesFacilities(site, filter.facilities)
  );

const compareByRiverMile = (a: Site, b: Site): number => {
  const byRiver = a.riverName.localeCompare(b.riverName);
  if (byRiver !== 0) return byRiver;
  return a.riverMile - b.riverMile;
};

const compareByName = (a: Site, b: Site): number =>
  a.name.localeCompare(b.name);

export const sortSites = (
  sites: readonly Site[],
  mode: SiteSortMode
): readonly Site[] => {
  const cmp = mode === 'alpha' ? compareByName : compareByRiverMile;
  return [...sites].sort(cmp);
};

/** Distinct river names present in the dataset, sorted alphabetically. */
export const collectRivers = (sites: readonly Site[]): readonly string[] => {
  const seen = new Set<string>();
  for (const site of sites) {
    if (site.riverName !== '') seen.add(site.riverName);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
};
