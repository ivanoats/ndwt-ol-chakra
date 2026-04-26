import type { Site, SiteId } from '../../domain';
import type { SiteRepository } from '../ports/site-repository';

export type GetSite = (id: SiteId) => Promise<Site | null>;

export const makeGetSite =
  (repo: SiteRepository): GetSite =>
  (id) =>
    repo.findById(id);
