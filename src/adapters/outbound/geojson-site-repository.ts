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

interface RawFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly RawFeature[];
}

const ID_KEY_CANDIDATES = ['web-scraper-order', '﻿web-scraper-order'] as const;
const SOURCE_URL_KEYS = ['web-scraper-start-url'] as const;

const readProp = (
  props: RawProps,
  ...keys: readonly string[]
): string | undefined => {
  for (const k of keys) {
    const v = props[k];
    if (v !== undefined && v !== '') return v;
  }
  return undefined;
};

const facilityFlags = (props: RawProps): Partial<Record<Facility, boolean>> => {
  const flags: Partial<Record<Facility, boolean>> = {};
  for (const f of FACILITIES) {
    flags[f] = props[`${f}-src`] === '1';
  }
  return flags;
};

const toSite = (feature: RawFeature, index: number): Site => {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const idRaw = readProp(p, ...ID_KEY_CANDIDATES) ?? `site-${index}`;
  const mile = Number(readProp(p, 'riverMile') ?? '');

  return {
    id: siteId(idRaw),
    riverSegment: readProp(p, 'riverSegment') ?? '',
    riverName: readProp(p, 'riverName') ?? '',
    riverMile: Number.isFinite(mile) ? mile : 0,
    bank: readProp(p, 'bank') ?? '',
    coordinates: coordinates(lng, lat),
    season: readProp(p, 'season'),
    camping: readProp(p, 'camping'),
    contact: readProp(p, 'contact'),
    phone: readProp(p, 'phone'),
    website: readProp(p, 'website'),
    facilities: FacilitySet.fromFlags(facilityFlags(p)),
    sourceUrl: readProp(p, ...SOURCE_URL_KEYS),
  };
};

export class GeoJsonSiteRepository implements SiteRepository {
  private cache: readonly Site[] | null = null;
  private inflight: Promise<readonly Site[]> | null = null;

  constructor(private readonly url: string) {}

  async list(): Promise<readonly Site[]> {
    if (this.cache !== null) return this.cache;
    if (this.inflight !== null) return this.inflight;

    this.inflight = (async () => {
      try {
        const res = await fetch(this.url);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch ${this.url}: ${res.status} ${res.statusText}`
          );
        }
        const body = (await res.json()) as RawFeatureCollection;
        const sites = body.features.map((feature, index) =>
          toSite(feature, index)
        );
        this.cache = sites;
        return sites;
      } finally {
        this.inflight = null;
      }
    })();

    return this.inflight;
  }

  async findById(id: SiteId): Promise<Site | null> {
    const all = await this.list();
    return all.find((s) => s.id === id) ?? null;
  }
}

export const __test = { toSite };
