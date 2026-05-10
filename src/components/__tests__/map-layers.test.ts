import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { describe, expect, it } from 'vitest';

import {
  createNoaaLayer,
  createOpenTopoLayer,
  createOsmLayer,
  createUsgsLayer,
  NOAA_ATTRIBUTION,
  NOAA_MAX_ZOOM,
  NOAA_TILE_URL,
  OPENTOPO_ATTRIBUTION,
  OPENTOPO_TILE_URL,
  USGS_ATTRIBUTION,
  USGS_MAX_ZOOM,
  USGS_TILE_URL,
} from '../map-layers';

describe('map-layers — OSM', () => {
  it('createOsmLayer wraps an OSM source', () => {
    const layer = createOsmLayer(true);
    expect(layer).toBeInstanceOf(TileLayer);
    expect(layer.getSource()).toBeInstanceOf(OSM);
    expect(layer.getVisible()).toBe(true);
  });
});

describe('map-layers — USGS', () => {
  it('points at the USGS National Map ArcGIS service with z/y/x ordering', () => {
    expect(USGS_TILE_URL).toMatch(
      /^https:\/\/basemap\.nationalmap\.gov\/arcgis\//
    );
    expect(USGS_TILE_URL).toContain('{z}/{y}/{x}');
  });

  it('attribution credits USGS', () => {
    expect(USGS_ATTRIBUTION).toMatch(/USGS/);
  });

  it('caps zoom at the published service max', () => {
    expect(USGS_MAX_ZOOM).toBe(16);
  });

  it('createUsgsLayer constructs a TileLayer<XYZ> at the right URL', () => {
    const layer = createUsgsLayer(false);
    expect(layer.getSource()).toBeInstanceOf(XYZ);
    expect(layer.getSource()?.getUrls()?.[0]).toBe(USGS_TILE_URL);
    expect(layer.getVisible()).toBe(false);
  });
});

describe('map-layers — OpenTopoMap', () => {
  it('uses OL subdomain template and OSM tile path', () => {
    expect(OPENTOPO_TILE_URL).toContain('{a-c}.tile.opentopomap.org');
    expect(OPENTOPO_TILE_URL).toContain('{z}/{x}/{y}.png');
  });

  it('attribution names OSM contributors and OpenTopoMap CC-BY-SA', () => {
    expect(OPENTOPO_ATTRIBUTION).toMatch(/OpenStreetMap contributors/);
    expect(OPENTOPO_ATTRIBUTION).toMatch(/CC-BY-SA/);
  });

  it('createOpenTopoLayer constructs a TileLayer<XYZ>', () => {
    const layer = createOpenTopoLayer(true);
    expect(layer.getSource()).toBeInstanceOf(XYZ);
    expect(layer.getVisible()).toBe(true);
  });
});

describe('map-layers — NOAA', () => {
  it('points at the NOAA NCDS public tile cache with an XYZ template', () => {
    expect(NOAA_TILE_URL).toMatch(
      /^https:\/\/tileservice\.charts\.noaa\.gov\//
    );
    expect(NOAA_TILE_URL).toContain('{z}/{x}/{y}');
  });

  it('attribution names NOAA Office of Coast Survey and the not-for-navigation caveat', () => {
    expect(NOAA_ATTRIBUTION).toMatch(/NOAA Office of Coast Survey/);
    expect(NOAA_ATTRIBUTION).toMatch(/Not for navigation/);
  });

  it('caps zoom at 16 to match the published NOAA cache range', () => {
    expect(NOAA_MAX_ZOOM).toBe(16);
  });

  it('createNoaaLayer constructs a TileLayer with an XYZ source', () => {
    const layer = createNoaaLayer(false);
    expect(layer).toBeInstanceOf(TileLayer);
    expect(layer.getSource()).toBeInstanceOf(XYZ);
  });

  it('honours the visibility argument', () => {
    expect(createNoaaLayer(true).getVisible()).toBe(true);
    expect(createNoaaLayer(false).getVisible()).toBe(false);
  });

  it('uses the configured URL on the source', () => {
    const layer = createNoaaLayer(false);
    expect(layer.getSource()?.getUrls()?.[0]).toBe(NOAA_TILE_URL);
  });
});
