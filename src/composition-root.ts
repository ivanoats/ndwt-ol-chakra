import { InMemorySiteRepository } from './adapters/outbound/in-memory-site-repository';
import type { SiteRepository } from './application/ports/site-repository';
import type { GetSite } from './application/use-cases/get-site';
import type { ListSites } from './application/use-cases/list-sites';
import type { Site, SiteId } from './domain';

let repository: SiteRepository = new InMemorySiteRepository([]);

/**
 * Phase 4 hydration entry point. The Next server component loads the
 * full Site[] at build time, then MapApp ('use client') calls this
 * once before any handler reads the repo.
 */
export const hydrateSites = (sites: readonly Site[]): void => {
  repository = new InMemorySiteRepository(sites);
};

export const listSites: ListSites = (): Promise<readonly Site[]> =>
  repository.list();

export const getSite: GetSite = (id: SiteId): Promise<Site | null> =>
  repository.findById(id);
