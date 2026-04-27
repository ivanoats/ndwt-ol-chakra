import { InMemorySiteRepository } from './adapters/outbound/in-memory-site-repository';
import { type GetSite, makeGetSite } from './application/use-cases/get-site';
import {
  type ListSites,
  makeListSites,
} from './application/use-cases/list-sites';
import type { Site } from './domain';

export interface Composition {
  readonly listSites: ListSites;
  readonly getSite: GetSite;
}

/**
 * Builds the client-side composition once per page from the Site[]
 * the Next server component handed in. Pure function — no globals,
 * no module-level mutation, safe for React concurrent renders.
 */
export const createComposition = (sites: readonly Site[]): Composition => {
  const repository = new InMemorySiteRepository(sites);
  return {
    listSites: makeListSites(repository),
    getSite: makeGetSite(repository),
  };
};
