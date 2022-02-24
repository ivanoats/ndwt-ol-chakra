import { Map, View } from 'ol';
import { GeoJSON } from 'ol/format';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import React, { useEffect } from 'react';

import '../style.css';

export default function MapComponent() {
  useEffect(() => {
    const source = new VectorSource({
      url: 'data//ndwt.geojson',
      format: new GeoJSON(),
    });

    const hoodRiver = fromLonLat([-121.5281, 45.7068]);
    const olMap = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: source,
        }),
      ],
      view: new View({
        center: hoodRiver,
        zoom: 7,
      }),
    });
  });
  return <div id="map" />;
}
