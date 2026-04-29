import type { Coordinates } from './coordinates';
import type { FacilitySet } from './facility';

export type SiteId = string & { readonly __brand: 'SiteId' };

export const siteId = (raw: string): SiteId => raw as SiteId;

export interface Site {
  readonly id: SiteId;
  readonly name: string;
  readonly slug: string;
  readonly riverSegment: string;
  readonly riverName: string;
  readonly riverMile: number;
  readonly bank: string;
  readonly coordinates: Coordinates;
  readonly state?: string;
  readonly county?: string;
  readonly season?: string;
  readonly camping?: string;
  readonly campingFee?: string;
  readonly contact?: string;
  readonly phone?: string;
  readonly website?: string;
  readonly notes?: string;
  readonly facilities: FacilitySet;
  readonly sourceUrl?: string;
}
