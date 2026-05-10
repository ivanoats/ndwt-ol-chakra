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

// Esri World Ocean Base — the de facto free public marine basemap.
// Sourced in part from NOAA, GEBCO, and other hydrographic agencies;
// it includes bathymetry, depth shading, and coastline detail useful
// for paddler trip-planning. NOAA's own NCDS doesn't serve live web
// tiles for the public (only MBTiles for download), so this is the
// closest functional substitute for a free chart-style basemap. Tiles
// are continuously hosted at server.arcgisonline.com, EPSG:3857, with
// /{z}/{y}/{x} ordering (ArcGIS convention). Cap at z=13 to match the
// service's published max — higher zooms return blank tiles.
export const NAUTICAL_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
export const NAUTICAL_ATTRIBUTION =
  'Tiles © <a href="https://www.esri.com/">Esri</a> — Sources: GEBCO, NOAA, National Geographic, DeLorme, HERE, Geonames.org and other contributors — Not for navigation';
export const NAUTICAL_MAX_ZOOM = 13;

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

export function createNauticalLayer(visible: boolean): TileLayer<XYZ> {
  return new TileLayer({
    source: new XYZ({
      url: NAUTICAL_TILE_URL,
      attributions: NAUTICAL_ATTRIBUTION,
      maxZoom: NAUTICAL_MAX_ZOOM,
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
  nautical: TileLayer<XYZ> | null;
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
  refs.nautical?.setVisible(active === 'nautical');
}

export function syncOverlayVisibility(
  refs: OverlayVisibilityRefs,
  active: ReadonlySet<OverlayId>
): void {
  refs.openSea?.setVisible(active.has('openseamap'));
  refs.hiking?.setVisible(active.has('hiking'));
}

export interface LayerRefs
  extends BaseMapVisibilityRefs, OverlayVisibilityRefs {}

// Initial ref shape — used both as the React useRef seed and for the
// cleanup reset on unmount. Spread when consumed so callers can't
// mutate the shared empty.
export const EMPTY_LAYER_REFS: Readonly<LayerRefs> = Object.freeze({
  osm: null,
  usgs: null,
  openTopo: null,
  nautical: null,
  openSea: null,
  hiking: null,
});

// buildLayers always returns concrete TileLayer instances, so the
// refs object's fields are non-nullable in this shape (the broader
// LayerRefs permits null because the React useRef seed and cleanup
// reset both populate it with nulls).
export type BuiltLayerRefs = {
  [K in keyof LayerRefs]: NonNullable<LayerRefs[K]>;
};

export interface BuiltLayers {
  refs: BuiltLayerRefs;
  ordered: TileLayer<OSM | XYZ>[];
}

// One-shot builder for every layer the map owns, given the current
// switcher state. Returns both a ref object (for visibility sync) and
// an ordered array (for the Map constructor's `layers` prop).
export function buildLayers(
  activeBaseMap: BaseMapId,
  activeOverlays: ReadonlySet<OverlayId>
): BuiltLayers {
  const osm = createOsmLayer(activeBaseMap === 'osm');
  const usgs = createUsgsLayer(activeBaseMap === 'usgs');
  const openTopo = createOpenTopoLayer(activeBaseMap === 'opentopomap');
  const nautical = createNauticalLayer(activeBaseMap === 'nautical');
  const openSea = createOpenSeaLayer(activeOverlays.has('openseamap'));
  const hiking = createHikingLayer(activeOverlays.has('hiking'));
  return {
    refs: { osm, usgs, openTopo, nautical, openSea, hiking },
    ordered: [osm, usgs, openTopo, nautical, openSea, hiking],
  };
}
