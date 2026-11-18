import type { Loader } from 'ol/source/DataTile';
import { PMTilesRasterSource } from 'ol-pmtiles';

export class NOAAChartSource extends PMTilesRasterSource {
  protected override setLoader(loader: Loader): void {
    let emptyTile: HTMLCanvasElement | undefined;
    super.setLoader(async (...args) => {
      const data = await loader(...args);
      if (data instanceof Uint8Array && data.length === 0) {
        if (emptyTile === undefined) {
          emptyTile = document.createElement('canvas');
          emptyTile.width = 256;
          emptyTile.height = 256;
        }
        return emptyTile;
      }
      return data;
    });
  }
}
