import { Feature, Map, View } from 'ol';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { useEffect, useRef } from 'react';

import { listSites } from '../composition-root';
import type { Site } from '../domain';

import '../style.css';

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
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;

    const map = new Map({
      target: container,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({
        center: fromLonLat([-121.5281, 45.7068]),
        zoom: 7,
      }),
    });
    mapRef.current = map;

    listSites()
      .then((sites) => {
        if (cancelled) return;
        const features = sites.map(siteToFeature);
        map.addLayer(
          new VectorLayer({ source: new VectorSource({ features }) })
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
      mapRef.current = null;
    };
  }, []);

  return <div id="map" ref={containerRef} />;
}
