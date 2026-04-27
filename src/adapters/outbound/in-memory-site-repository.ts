import type { SiteRepository } from '../../application/ports/site-repository';
import type { Site, SiteId } from '../../domain';

/**
 * In-memory SiteRepository, used on the client after Next's server
 * loader has handed the full Site[] over via React props. Lookups
 * are O(1) via a Map keyed by SiteId.
 */
export class InMemorySiteRepository implements SiteRepository {
  private readonly byId: ReadonlyMap<SiteId, Site>;

  constructor(private readonly sites: readonly Site[]) {
    this.byId = new Map<SiteId, Site>(sites.map((site) => [site.id, site]));
  }

  list(): Promise<readonly Site[]> {
    return Promise.resolve(this.sites);
  }

  findById(id: SiteId): Promise<Site | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
}
