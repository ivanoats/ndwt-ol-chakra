'use client';

import { Feature, Map, View } from 'ol';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { useEffect, useRef, useState } from 'react';

import type { GetSite } from '../application/use-cases/get-site';
import type { Site } from '../domain';

import LayerSwitcher, { type BaseMapId, type OverlayId } from './LayerSwitcher';
import { makeHandleClick, makeHandlePointerMove } from './map-handlers';

type GlobalWithMap = typeof globalThis & { __ndwtMap?: Map };

const MARKER_STYLE = new Style({
  image: new Circle({
    radius: 6,
    fill: new Fill({ color: 'rgba(56, 161, 105, 0.85)' }),
    stroke: new Stroke({ color: '#1a202c', width: 1.5 }),
  }),
});

const siteToFeature = (site: Site): Feature<Point> => {
  const feature = new Feature({
    geometry: new Point(
      fromLonLat([site.coordinates.longitude, site.coordinates.latitude])
    ),
  });
  feature.setId(site.id);
  return feature;
};

interface LayerRefs {
  osm: TileLayer<OSM> | null;
  usgs: TileLayer<XYZ> | null;
  openTopo: TileLayer<XYZ> | null;
  openSea: TileLayer<XYZ> | null;
  hiking: TileLayer<XYZ> | null;
}

interface MapComponentProps {
  readonly sites: readonly Site[];
  readonly getSite: GetSite;
}

const DEFAULT_OVERLAYS: ReadonlySet<OverlayId> = new Set<OverlayId>([
  'openseamap',
]);

export default function MapComponent({ sites, getSite }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<LayerRefs>({
    osm: null,
    usgs: null,
    openTopo: null,
    openSea: null,
    hiking: null,
  });

  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapId>('osm');
  const [activeOverlays, setActiveOverlays] =
    useState<ReadonlySet<OverlayId>>(DEFAULT_OVERLAYS);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    // Initialize each layer's visibility from current state so a
    // map re-init (e.g. on `sites`/`getSite` change) preserves the
    // user's selections. The two sync effects below handle later
    // toggles without rebuilding the map.
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: activeBaseMap === 'osm',
    });
    // USGS National Map — official US government topographic basemap.
    // Service docs: https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer
    const usgsLayer = new TileLayer({
      source: new XYZ({
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Map data: © <a href="https://www.usgs.gov/">USGS</a>',
        maxZoom: 16,
      }),
      visible: activeBaseMap === 'usgs',
    });
    // OpenTopoMap — OSM + SRTM elevation rendering.
    // {a-c} is an OL subdomain template expanded to a/b/c for load balancing.
    const openTopoLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attributions:
          'Map data: © OpenStreetMap contributors, SRTM | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
      }),
      visible: activeBaseMap === 'opentopomap',
    });
    const openSeaLayer = new TileLayer({
      zIndex: 10,
      source: new XYZ({
        url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
        attributions:
          'Marine data: © <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
      }),
      visible: activeOverlays.has('openseamap'),
    });
    const hikingLayer = new TileLayer({
      zIndex: 5,
      source: new XYZ({
        url: 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
        attributions:
          'Trail data: © OpenStreetMap contributors | <a href="https://waymarkedtrails.org">Waymarked Trails</a>',
      }),
      visible: activeOverlays.has('hiking'),
    });

    layerRefs.current = {
      osm: osmLayer,
      usgs: usgsLayer,
      openTopo: openTopoLayer,
      openSea: openSeaLayer,
      hiking: hikingLayer,
    };

    const map = new Map({
      target: container,
      layers: [
        osmLayer,
        usgsLayer,
        openTopoLayer,
        openSeaLayer,
        hikingLayer,
        new VectorLayer({
          zIndex: 20,
          source: new VectorSource({ features: sites.map(siteToFeature) }),
          style: MARKER_STYLE,
        }),
      ],
      view: new View({
        center: fromLonLat([-121.5281, 45.7068]),
        zoom: 7,
      }),
    });
    map.on('click', makeHandleClick(map, getSite));
    map.on('pointermove', makeHandlePointerMove(map));

    // Always-exposed handle on globalThis so Playwright can drive
    // deterministic interactions in the e2e suite. Safe to ship in
    // production: it's the same Map a real user already has via the
    // DOM, and the surface area is one read-only reference.
    (globalThis as GlobalWithMap).__ndwtMap = map;

    return () => {
      map.setTarget();
      delete (globalThis as GlobalWithMap).__ndwtMap;
      layerRefs.current = {
        osm: null,
        usgs: null,
        openTopo: null,
        openSea: null,
        hiking: null,
      };
    };
    // activeBaseMap / activeOverlays are read for *initial* layer
    // visibility only; later toggles are handled by the dedicated
    // sync effects below. Including them here would rebuild the
    // whole map on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, getSite]);

  // Sync base map visibility whenever activeBaseMap changes.
  useEffect(() => {
    const { osm, usgs, openTopo } = layerRefs.current;
    osm?.setVisible(activeBaseMap === 'osm');
    usgs?.setVisible(activeBaseMap === 'usgs');
    openTopo?.setVisible(activeBaseMap === 'opentopomap');
  }, [activeBaseMap]);

  // Sync overlay visibility whenever activeOverlays changes.
  useEffect(() => {
    const { openSea, hiking } = layerRefs.current;
    openSea?.setVisible(activeOverlays.has('openseamap'));
    hiking?.setVisible(activeOverlays.has('hiking'));
  }, [activeOverlays]);

  const handleOverlayToggle = (id: OverlayId) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div id="map" ref={containerRef}>
      <LayerSwitcher
        activeBaseMap={activeBaseMap}
        activeOverlays={activeOverlays}
        onBaseMapChange={setActiveBaseMap}
        onOverlayToggle={handleOverlayToggle}
      />
    </div>
  );
}
