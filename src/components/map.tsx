import { Map, View } from 'ol';
import { GeoJSON } from 'ol/format';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { useEffect, useRef } from 'react';

import '../style.css';

export default function MapComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({
          source: new VectorSource({
            url: 'data/ndwt.geojson',
            format: new GeoJSON(),
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([-121.5281, 45.7068]),
        zoom: 7,
      }),
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  return <div id="map" ref={containerRef} />;
}
