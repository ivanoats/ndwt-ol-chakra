import type { Site, SiteId } from '../../domain';

export interface SiteRepository {
  list(): Promise<readonly Site[]>;
  findById(id: SiteId): Promise<Site | null>;
}
