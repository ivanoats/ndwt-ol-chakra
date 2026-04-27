import { GeoJsonSiteRepository } from './adapters/outbound/geojson-site-repository';
import { type GetSite, makeGetSite } from './application/use-cases/get-site';
import {
  type ListSites,
  makeListSites,
} from './application/use-cases/list-sites';

const SITES_GEOJSON_URL = 'data/ndwt.geojson';

const siteRepository = new GeoJsonSiteRepository(SITES_GEOJSON_URL);

export const listSites: ListSites = makeListSites(siteRepository);
export const getSite: GetSite = makeGetSite(siteRepository);
