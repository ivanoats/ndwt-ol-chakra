import type { SiteRepository } from '../../application/ports/site-repository';
import {
  coordinates,
  FACILITIES,
  type Facility,
  FacilitySet,
  type Site,
  type SiteId,
  siteId,
} from '../../domain';

interface RawProps {
  readonly [key: string]: string | undefined;
}

interface RawFeature {
  readonly type: 'Feature';
  readonly properties: RawProps;
  readonly geometry: {
    readonly type: 'Point';
    readonly coordinates: readonly [number, number];
  };
}

export interface RawFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly RawFeature[];
}

/**
 * Pure mapper from a parsed GeoJSON FeatureCollection to a Site[].
 * Used by both the runtime fetch path (this file's class) and the
 * build-time fs path (src/adapters/inbound/next/load-sites.ts).
 */
export const parseSitesFromGeoJson = (
  body: RawFeatureCollection
): readonly Site[] =>
  body.features.map((feature, index) => toSite(feature, index));

const ID_KEY_CANDIDATES = ['web-scraper-order', '﻿web-scraper-order'] as const;
const SOURCE_URL_KEYS = ['web-scraper-start-url'] as const;

const readProp = (
  props: RawProps,
  ...keys: readonly string[]
): string | undefined => {
  for (const key of keys) {
    const value = props[key];
    if (value !== undefined && value !== '') return value;
  }
  return undefined;
};

const facilityFlags = (props: RawProps): Partial<Record<Facility, boolean>> => {
  const flags: Partial<Record<Facility, boolean>> = {};
  for (const facility of FACILITIES) {
    flags[facility] = props[`${facility}-src`] === '1';
  }
  return flags;
};

const toSite = (feature: RawFeature, index: number): Site => {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const idRaw = readProp(props, ...ID_KEY_CANDIDATES) ?? `site-${index}`;
  const mile = Number(readProp(props, 'riverMile') ?? '');

  return {
    id: siteId(idRaw),
    riverSegment: readProp(props, 'riverSegment') ?? '',
    riverName: readProp(props, 'riverName') ?? '',
    riverMile: Number.isFinite(mile) ? mile : 0,
    bank: readProp(props, 'bank') ?? '',
    coordinates: coordinates(lng, lat),
    season: readProp(props, 'season'),
    camping: readProp(props, 'camping'),
    contact: readProp(props, 'contact'),
    phone: readProp(props, 'phone'),
    website: readProp(props, 'website'),
    facilities: FacilitySet.fromFlags(facilityFlags(props)),
    sourceUrl: readProp(props, ...SOURCE_URL_KEYS),
  };
};

export class GeoJsonSiteRepository implements SiteRepository {
  private cache: readonly Site[] | null = null;
  private inflight: Promise<readonly Site[]> | null = null;

  constructor(private readonly url: string) {}

  list(): Promise<readonly Site[]> {
    if (this.cache !== null) return Promise.resolve(this.cache);
    if (this.inflight !== null) return this.inflight;

    this.inflight = this.fetchAndParse();
    return this.inflight;
  }

  async findById(id: SiteId): Promise<Site | null> {
    const all = await this.list();
    return all.find((site) => site.id === id) ?? null;
  }

  private async fetchAndParse(): Promise<readonly Site[]> {
    try {
      const res = await fetch(this.url);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch ${this.url}: ${res.status} ${res.statusText}`
        );
      }
      const body = (await res.json()) as RawFeatureCollection;
      const sites = parseSitesFromGeoJson(body);
      this.cache = sites;
      return sites;
    } finally {
      this.inflight = null;
    }
  }
}

export const __test = { toSite };
