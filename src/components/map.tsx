import type { MapBrowserEvent } from 'ol';
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
import type { Site, SiteId } from '../domain';
import { useSelectedSite } from '../store/selected-site';

import '../style.css';

const MARKER_STYLE = new Style({
  image: new Circle({
    radius: 6,
    fill: new Fill({ color: 'rgba(56, 161, 105, 0.85)' }),
    stroke: new Stroke({ color: '#1a202c', width: 1.5 }),
  }),
});

const HIT_TOLERANCE_PX = 6;

const siteToFeature = (site: Site): Feature<Point> => {
  const feature = new Feature({
    geometry: new Point(
      fromLonLat([site.coordinates.longitude, site.coordinates.latitude])
    ),
  });
  feature.setId(site.id);
  return feature;
};

const handleMapClick =
  (map: Map) =>
  (event: MapBrowserEvent<UIEvent>): void => {
    let pickedId: SiteId | null = null;
    map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        const id = feature.getId();
        if (typeof id === 'string') {
          pickedId = id as SiteId;
          return true;
        }
        return false;
      },
      { hitTolerance: HIT_TOLERANCE_PX }
    );
    if (pickedId === null) return;

    void getSite(pickedId).then((site) => {
      if (site) useSelectedSite.getState().select(site);
    });
  };

export default function MapComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

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
    mapRef.current = map;
    map.on('click', handleMapClick(map));

    // Test-only hook so Playwright can dispatch deterministic clicks
    // on known features. Safe to expose: it's the same Map a real
    // user already has via the DOM.
    (window as Window & { __ndwtMap?: Map }).__ndwtMap = map;

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
      mapRef.current = null;
      delete (window as Window & { __ndwtMap?: Map }).__ndwtMap;
    };
  }, []);

  return <div id="map" ref={containerRef} />;
}
