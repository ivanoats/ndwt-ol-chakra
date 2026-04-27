import { Feature, Map, View } from 'ol';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { useEffect, useRef } from 'react';

import { getSite, listSites } from '../composition-root';
import type { Site } from '../domain';

import { makeHandleClick, makeHandlePointerMove } from './map-handlers';

import '../style.css';

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

export default function MapComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;

    let cancelled = false;

    const map = new Map({
      target: container,
      layers: [new TileLayer({ source: new OSM() })],
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

    listSites()
      .then((sites) => {
        if (cancelled) return;
        const features = sites.map(siteToFeature);
        map.addLayer(
          new VectorLayer({
            source: new VectorSource({ features }),
            style: MARKER_STYLE,
          })
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.error('Failed to load sites', err);
        }
      });

    return () => {
      cancelled = true;
      map.setTarget();
      delete (globalThis as GlobalWithMap).__ndwtMap;
    };
  }, []);

  return <div id="map" ref={containerRef} />;
}
