import type { Site } from '../../domain';
import type { SiteRepository } from '../ports/site-repository';

export type ListSites = () => Promise<readonly Site[]>;

export const makeListSites =
  (repo: SiteRepository): ListSites =>
  () =>
    repo.list();
