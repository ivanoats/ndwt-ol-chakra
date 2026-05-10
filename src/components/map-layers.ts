import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';

import type { BaseMapId, OverlayId } from './LayerSwitcher';

// USGS National Map — official US government topographic basemap.
// The ArcGIS REST endpoint flips x/y in the path: /tile/{z}/{y}/{x}.
export const USGS_TILE_URL =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}';
export const USGS_ATTRIBUTION =
  'Map data: © <a href="https://www.usgs.gov/">USGS</a>';
export const USGS_MAX_ZOOM = 16;

// OpenTopoMap — OSM + SRTM elevation rendering. {a-c} is OL's
// subdomain template, expanded to a/b/c for load balancing.
export const OPENTOPO_TILE_URL =
  'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png';
export const OPENTOPO_ATTRIBUTION =
  'Map data: © OpenStreetMap contributors, SRTM | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)';

// NOAA Chart Display Service — public XYZ cache that fronts NCDS.
// Tiles are raster PNGs re-rendered weekly from the latest ENC vector
// data, in EPSG:3857. Cap at z=16 to avoid 404s above NOAA's
// published cache range. Disclaimer is baked into the attribution
// string so OL's default control surfaces it whenever the layer is
// visible — these tiles are not certified for navigation.
export const NOAA_TILE_URL =
  'https://tileservice.charts.noaa.gov/tiles/50000_1/{z}/{x}/{y}.png';
export const NOAA_ATTRIBUTION =
  'Charts: © <a href="https://nauticalcharts.noaa.gov/">NOAA Office of Coast Survey</a> — Not for navigation';
export const NOAA_MAX_ZOOM = 16;

export function createOsmLayer(visible: boolean): TileLayer<OSM> {
  return new TileLayer({ source: new OSM(), visible });
}

export function createUsgsLayer(visible: boolean): TileLayer<XYZ> {
  return new TileLayer({
    source: new XYZ({
      url: USGS_TILE_URL,
      attributions: USGS_ATTRIBUTION,
      maxZoom: USGS_MAX_ZOOM,
    }),
    visible,
  });
}

export function createOpenTopoLayer(visible: boolean): TileLayer<XYZ> {
  return new TileLayer({
    source: new XYZ({
      url: OPENTOPO_TILE_URL,
      attributions: OPENTOPO_ATTRIBUTION,
    }),
    visible,
  });
}

export function createNoaaLayer(visible: boolean): TileLayer<XYZ> {
  return new TileLayer({
    source: new XYZ({
      url: NOAA_TILE_URL,
      attributions: NOAA_ATTRIBUTION,
      maxZoom: NOAA_MAX_ZOOM,
    }),
    visible,
  });
}

// OpenSeaMap seamarks — transparent overlay rendering buoys, beacons,
// lights, anchorages on top of the active basemap. zIndex keeps it
// above all basemaps but below site markers.
export const OPENSEA_TILE_URL =
  'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
export const OPENSEA_ATTRIBUTION =
  'Marine data: © <a href="https://www.openseamap.org">OpenSeaMap</a> contributors';
export const OPENSEA_Z_INDEX = 10;

// Waymarked Trails hiking overlay — transparent OSM-derived tiles for
// foot trails near launches.
export const HIKING_TILE_URL =
  'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png';
export const HIKING_ATTRIBUTION =
  'Trail data: © OpenStreetMap contributors | <a href="https://waymarkedtrails.org">Waymarked Trails</a>';
export const HIKING_Z_INDEX = 5;

export function createOpenSeaLayer(visible: boolean): TileLayer<XYZ> {
  return new TileLayer({
    zIndex: OPENSEA_Z_INDEX,
    source: new XYZ({
      url: OPENSEA_TILE_URL,
      attributions: OPENSEA_ATTRIBUTION,
    }),
    visible,
  });
}

export function createHikingLayer(visible: boolean): TileLayer<XYZ> {
  return new TileLayer({
    zIndex: HIKING_Z_INDEX,
    source: new XYZ({
      url: HIKING_TILE_URL,
      attributions: HIKING_ATTRIBUTION,
    }),
    visible,
  });
}

// Subset of LayerRefs needed for visibility syncing. Kept here so the
// pure helpers can be unit-tested without dragging in the full map
// component refs.
export interface BaseMapVisibilityRefs {
  osm: TileLayer<OSM> | null;
  usgs: TileLayer<XYZ> | null;
  openTopo: TileLayer<XYZ> | null;
  noaa: TileLayer<XYZ> | null;
}

export interface OverlayVisibilityRefs {
  openSea: TileLayer<XYZ> | null;
  hiking: TileLayer<XYZ> | null;
}

export function syncBaseMapVisibility(
  refs: BaseMapVisibilityRefs,
  active: BaseMapId
): void {
  refs.osm?.setVisible(active === 'osm');
  refs.usgs?.setVisible(active === 'usgs');
  refs.openTopo?.setVisible(active === 'opentopomap');
  refs.noaa?.setVisible(active === 'noaa');
}

export function syncOverlayVisibility(
  refs: OverlayVisibilityRefs,
  active: ReadonlySet<OverlayId>
): void {
  refs.openSea?.setVisible(active.has('openseamap'));
  refs.hiking?.setVisible(active.has('hiking'));
}
