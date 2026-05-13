'use client';

import { Feature, Map, View } from 'ol';
import type { EventsKey } from 'ol/events';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { unByKey } from 'ol/Observable';
import { fromLonLat } from 'ol/proj';
import type DataTileSource from 'ol/source/DataTile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { PMTilesRasterSource } from 'ol-pmtiles';
import { useEffect, useRef, useState } from 'react';

import type { GetSite } from '../application/use-cases/get-site';
import type { Site } from '../domain';
import type { LayerKey } from '../store/tile-health';
import { useTileHealth } from '../store/tile-health';

import LayerSwitcher, {
  BASE_MAPS,
  type BaseMapId,
  type OverlayId,
} from './LayerSwitcher';
import { makeHandleClick, makeHandlePointerMove } from './map-handlers';
import OfflineIndicator from './OfflineIndicator';
import TileHealthBanner from './TileHealthBanner';

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
  aerial: TileLayer<XYZ> | null;
  openSea: TileLayer<XYZ> | null;
  hiking: TileLayer<XYZ> | null;
  noaaCharts: TileLayer<DataTileSource> | null;
}

// PoC: NOAA Chart Display Service PMTiles. Set via env var so dev
// can point at a local file (`/data/charts/ncds_21.pmtiles`) and
// production at a CDN-hosted archive (R2 / B2). When unset, the
// NOAA Charts layer is rendered as a non-functional placeholder
// (visible button in the layer switcher, but no tiles fetched) —
// the actual chart layer only activates when the URL is provided.
const NOAA_CHARTS_PMTILES_URL = process.env.NEXT_PUBLIC_NOAA_CHARTS_URL ?? '';

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
    aerial: null,
    openSea: null,
    hiking: null,
    noaaCharts: null,
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
    // USGS National Map ImageryOnly — public-domain orthoimagery
    // basemap from the same TNM service as the USGS Topo layer.
    // Uses ArcGIS z/y/x ordering (the path flips x/y).
    const aerialLayer = new TileLayer({
      source: new XYZ({
        url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
        attributions:
          'Imagery: © <a href="https://www.usgs.gov/">USGS</a> National Map',
        maxZoom: 16,
      }),
      visible: activeBaseMap === 'aerial',
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
    // NOAA Chart Display Service raster tiles, packaged as a single
    // PMTiles archive and served via HTTP range requests. Construction
    // is conditional on NOAA_CHARTS_PMTILES_URL being set — without a
    // URL we skip the source entirely so the page doesn't issue a
    // failed fetch on first paint. The button still appears in the
    // layer switcher; clicking it without the URL configured renders
    // a blank canvas with the attribution string only.
    const noaaChartsLayer = new TileLayer<DataTileSource>({
      source:
        NOAA_CHARTS_PMTILES_URL === ''
          ? undefined
          : new PMTilesRasterSource({
              url: NOAA_CHARTS_PMTILES_URL,
              attributions:
                'Charts: © <a href="https://nauticalcharts.noaa.gov/">NOAA Office of Coast Survey</a> — <strong>Not for navigation</strong>',
            }),
      visible: activeBaseMap === 'noaa-charts',
    });

    layerRefs.current = {
      osm: osmLayer,
      usgs: usgsLayer,
      openTopo: openTopoLayer,
      aerial: aerialLayer,
      openSea: openSeaLayer,
      hiking: hikingLayer,
      noaaCharts: noaaChartsLayer,
    };

    // Wire OL tile-load events into the tile-health store so the
    // banner can show when the active basemap is failing. Use the
    // store's getState() — these listeners run outside React's
    // render lifecycle, so we don't need (and can't safely use) a
    // hook subscription here. Capture the EventsKeys so the cleanup
    // returned by this effect can detach them via unByKey; otherwise
    // a re-run of the effect (e.g. on `sites` change) would leave
    // the previous map's sources holding live listeners and double-
    // count tile events for the rebuilt map.
    const recordSuccess = useTileHealth.getState().recordSuccess;
    const recordError = useTileHealth.getState().recordError;
    const tileEventKeys: EventsKey[] = [];
    const trackTileEvents = (key: LayerKey, layer: TileLayer<OSM | XYZ>) => {
      const source = layer.getSource();
      if (source === null) return;
      tileEventKeys.push(
        source.on('tileloadend', () => recordSuccess(key)) as EventsKey,
        source.on('tileloaderror', () => recordError(key)) as EventsKey
      );
    };
    trackTileEvents('osm', osmLayer);
    trackTileEvents('usgs', usgsLayer);
    trackTileEvents('opentopomap', openTopoLayer);
    trackTileEvents('aerial', aerialLayer);
    trackTileEvents('openseamap', openSeaLayer);
    trackTileEvents('hiking', hikingLayer);

    const map = new Map({
      target: container,
      layers: [
        osmLayer,
        usgsLayer,
        openTopoLayer,
        aerialLayer,
        noaaChartsLayer,
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
      // Detach tile-load listeners so the next mount's tracker
      // doesn't double-count and the old sources can be GC'd once
      // their in-flight requests settle.
      for (const k of tileEventKeys) unByKey(k);
      map.setTarget();
      delete (globalThis as GlobalWithMap).__ndwtMap;
      layerRefs.current = {
        osm: null,
        usgs: null,
        openTopo: null,
        aerial: null,
        openSea: null,
        hiking: null,
        noaaCharts: null,
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
    const { osm, usgs, openTopo, aerial, noaaCharts } = layerRefs.current;
    osm?.setVisible(activeBaseMap === 'osm');
    usgs?.setVisible(activeBaseMap === 'usgs');
    openTopo?.setVisible(activeBaseMap === 'opentopomap');
    aerial?.setVisible(activeBaseMap === 'aerial');
    noaaCharts?.setVisible(activeBaseMap === 'noaa-charts');
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

  const activeLayerLabel =
    BASE_MAPS.find((b) => b.id === activeBaseMap)?.label ?? activeBaseMap;

  return (
    <div id="map" ref={containerRef}>
      <TileHealthBanner
        activeLayer={activeBaseMap}
        activeLayerLabel={activeLayerLabel}
        onSwitchTo={setActiveBaseMap}
      />
      <LayerSwitcher
        activeBaseMap={activeBaseMap}
        activeOverlays={activeOverlays}
        onBaseMapChange={setActiveBaseMap}
        onOverlayToggle={handleOverlayToggle}
      />
      <OfflineIndicator />
    </div>
  );
}
