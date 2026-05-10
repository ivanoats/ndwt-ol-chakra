'use client';

import { Feature, Map, View } from 'ol';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { useEffect, useRef, useState } from 'react';

import type { GetSite } from '../application/use-cases/get-site';
import type { Site } from '../domain';

import LayerSwitcher, { type BaseMapId, type OverlayId } from './LayerSwitcher';
import { makeHandleClick, makeHandlePointerMove } from './map-handlers';
import {
  buildLayers,
  EMPTY_LAYER_REFS,
  type LayerRefs,
  syncBaseMapVisibility,
  syncOverlayVisibility,
} from './map-layers';

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

interface MapComponentProps {
  readonly sites: readonly Site[];
  readonly getSite: GetSite;
}

const DEFAULT_OVERLAYS: ReadonlySet<OverlayId> = new Set<OverlayId>([
  'openseamap',
]);

export default function MapComponent({ sites, getSite }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<LayerRefs>({ ...EMPTY_LAYER_REFS });

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
    // Layer factories and ordering live in ./map-layers so per-source
    // URLs, attribution strings, and visibility syncing stay
    // unit-testable in jsdom (OL's TileLayer/XYZ constructors don't
    // need a canvas).
    const { refs, ordered } = buildLayers(activeBaseMap, activeOverlays);
    layerRefs.current = refs;

    const map = new Map({
      target: container,
      layers: [
        ...ordered,
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
      layerRefs.current = { ...EMPTY_LAYER_REFS };
    };
    // activeBaseMap / activeOverlays are read for *initial* layer
    // visibility only; later toggles are handled by the dedicated
    // sync effects below. Including them here would rebuild the
    // whole map on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, getSite]);

  // Sync base map visibility whenever activeBaseMap changes.
  useEffect(() => {
    syncBaseMapVisibility(layerRefs.current, activeBaseMap);
  }, [activeBaseMap]);

  // Sync overlay visibility whenever activeOverlays changes.
  useEffect(() => {
    syncOverlayVisibility(layerRefs.current, activeOverlays);
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
