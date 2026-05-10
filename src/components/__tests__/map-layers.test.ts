import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { describe, expect, it, vi } from 'vitest';

import type { OverlayId } from '../LayerSwitcher';
import {
  buildLayers,
  createHikingLayer,
  createNoaaLayer,
  createOpenSeaLayer,
  createOpenTopoLayer,
  createOsmLayer,
  createUsgsLayer,
  EMPTY_LAYER_REFS,
  HIKING_ATTRIBUTION,
  HIKING_TILE_URL,
  HIKING_Z_INDEX,
  NOAA_ATTRIBUTION,
  NOAA_MAX_ZOOM,
  NOAA_TILE_URL,
  OPENSEA_ATTRIBUTION,
  OPENSEA_TILE_URL,
  OPENSEA_Z_INDEX,
  OPENTOPO_ATTRIBUTION,
  OPENTOPO_TILE_URL,
  syncBaseMapVisibility,
  syncOverlayVisibility,
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

describe('map-layers — OpenSeaMap overlay', () => {
  it('points at the OpenSeaMap seamarks tile path', () => {
    expect(OPENSEA_TILE_URL).toMatch(/^https:\/\/tiles\.openseamap\.org\//);
    expect(OPENSEA_TILE_URL).toContain('seamark/{z}/{x}/{y}');
  });

  it('attribution names OpenSeaMap contributors', () => {
    expect(OPENSEA_ATTRIBUTION).toMatch(/OpenSeaMap/);
  });

  it('createOpenSeaLayer applies the seamarks z-index above basemaps', () => {
    const layer = createOpenSeaLayer(true);
    expect(layer.getZIndex()).toBe(OPENSEA_Z_INDEX);
    expect(layer.getVisible()).toBe(true);
  });
});

describe('map-layers — Hiking overlay', () => {
  it('points at the Waymarked Trails hiking tile path', () => {
    expect(HIKING_TILE_URL).toMatch(
      /^https:\/\/tile\.waymarkedtrails\.org\/hiking\//
    );
  });

  it('attribution credits OSM contributors and Waymarked Trails', () => {
    expect(HIKING_ATTRIBUTION).toMatch(/OpenStreetMap contributors/);
    expect(HIKING_ATTRIBUTION).toMatch(/Waymarked Trails/);
  });

  it('createHikingLayer sits below the seamarks overlay', () => {
    const layer = createHikingLayer(false);
    expect(layer.getZIndex()).toBe(HIKING_Z_INDEX);
    expect(HIKING_Z_INDEX).toBeLessThan(OPENSEA_Z_INDEX);
    expect(layer.getVisible()).toBe(false);
  });
});

describe('syncBaseMapVisibility', () => {
  function makeRefs() {
    return {
      osm: { setVisible: vi.fn() } as unknown as TileLayer<OSM>,
      usgs: { setVisible: vi.fn() } as unknown as TileLayer<XYZ>,
      openTopo: { setVisible: vi.fn() } as unknown as TileLayer<XYZ>,
      noaa: { setVisible: vi.fn() } as unknown as TileLayer<XYZ>,
    };
  }

  it('shows only the active basemap', () => {
    const refs = makeRefs();
    syncBaseMapVisibility(refs, 'noaa');
    expect(refs.osm.setVisible).toHaveBeenCalledWith(false);
    expect(refs.usgs.setVisible).toHaveBeenCalledWith(false);
    expect(refs.openTopo.setVisible).toHaveBeenCalledWith(false);
    expect(refs.noaa.setVisible).toHaveBeenCalledWith(true);
  });

  it('handles each basemap id', () => {
    for (const id of ['osm', 'usgs', 'opentopomap', 'noaa'] as const) {
      const refs = makeRefs();
      syncBaseMapVisibility(refs, id);
      const expected = {
        osm: id === 'osm',
        usgs: id === 'usgs',
        openTopo: id === 'opentopomap',
        noaa: id === 'noaa',
      };
      expect(refs.osm.setVisible).toHaveBeenCalledWith(expected.osm);
      expect(refs.usgs.setVisible).toHaveBeenCalledWith(expected.usgs);
      expect(refs.openTopo.setVisible).toHaveBeenCalledWith(expected.openTopo);
      expect(refs.noaa.setVisible).toHaveBeenCalledWith(expected.noaa);
    }
  });

  it('skips null refs (map not yet initialized)', () => {
    const refs = { osm: null, usgs: null, openTopo: null, noaa: null };
    expect(() => syncBaseMapVisibility(refs, 'osm')).not.toThrow();
  });
});

describe('syncOverlayVisibility', () => {
  function makeRefs() {
    return {
      openSea: { setVisible: vi.fn() } as unknown as TileLayer<XYZ>,
      hiking: { setVisible: vi.fn() } as unknown as TileLayer<XYZ>,
    };
  }

  it('toggles overlays based on the active set', () => {
    const refs = makeRefs();
    syncOverlayVisibility(refs, new Set<OverlayId>(['openseamap']));
    expect(refs.openSea.setVisible).toHaveBeenCalledWith(true);
    expect(refs.hiking.setVisible).toHaveBeenCalledWith(false);
  });

  it('hides everything when the set is empty', () => {
    const refs = makeRefs();
    syncOverlayVisibility(refs, new Set<OverlayId>());
    expect(refs.openSea.setVisible).toHaveBeenCalledWith(false);
    expect(refs.hiking.setVisible).toHaveBeenCalledWith(false);
  });

  it('shows everything when both ids are active', () => {
    const refs = makeRefs();
    syncOverlayVisibility(refs, new Set<OverlayId>(['openseamap', 'hiking']));
    expect(refs.openSea.setVisible).toHaveBeenCalledWith(true);
    expect(refs.hiking.setVisible).toHaveBeenCalledWith(true);
  });

  it('skips null refs', () => {
    const refs = { openSea: null, hiking: null };
    expect(() =>
      syncOverlayVisibility(refs, new Set<OverlayId>(['openseamap']))
    ).not.toThrow();
  });
});

describe('EMPTY_LAYER_REFS', () => {
  it('has every ref nulled out', () => {
    expect(EMPTY_LAYER_REFS).toEqual({
      osm: null,
      usgs: null,
      openTopo: null,
      noaa: null,
      openSea: null,
      hiking: null,
    });
  });

  it('is frozen so callers cannot mutate the shared empty', () => {
    expect(Object.isFrozen(EMPTY_LAYER_REFS)).toBe(true);
  });
});

describe('buildLayers', () => {
  it('returns refs for every layer the map owns', () => {
    const { refs } = buildLayers('noaa', new Set<OverlayId>(['openseamap']));
    expect(Object.keys(refs).sort()).toEqual([
      'hiking',
      'noaa',
      'openSea',
      'openTopo',
      'osm',
      'usgs',
    ]);
  });

  it('marks only the active basemap visible', () => {
    const { refs } = buildLayers('noaa', new Set<OverlayId>());
    expect(refs.osm.getVisible()).toBe(false);
    expect(refs.usgs.getVisible()).toBe(false);
    expect(refs.openTopo.getVisible()).toBe(false);
    expect(refs.noaa.getVisible()).toBe(true);
  });

  it('marks only the requested overlays visible', () => {
    const { refs } = buildLayers('osm', new Set<OverlayId>(['hiking']));
    expect(refs.openSea.getVisible()).toBe(false);
    expect(refs.hiking.getVisible()).toBe(true);
  });

  it('orders layers basemap-first then overlays so seamarks paint above', () => {
    const { refs, ordered } = buildLayers('osm', new Set<OverlayId>());
    expect(ordered).toEqual([
      refs.osm,
      refs.usgs,
      refs.openTopo,
      refs.noaa,
      refs.openSea,
      refs.hiking,
    ]);
  });
});
