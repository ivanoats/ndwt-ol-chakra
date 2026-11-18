import TileState from 'ol/TileState';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NOAAChartSource } from '../noaa-chart-source';

const { loadTile } = vi.hoisted(() => ({ loadTile: vi.fn() }));

vi.mock('ol-pmtiles', async () => {
  const { default: DataTileSource } = await import('ol/source/DataTile');
  const { createXYZ } = await import('ol/tilegrid');
  return {
    PMTilesRasterSource: class extends DataTileSource {
      constructor() {
        super({ tileGrid: createXYZ({ maxZoom: 15 }) });
        this.setLoader(loadTile);
      }
    },
  };
});

describe('NOAAChartSource', () => {
  beforeEach(() => {
    loadTile.mockReset();
  });

  it('renders missing tiles as transparent images', async () => {
    loadTile.mockResolvedValue(new Uint8Array());
    const source = new NOAAChartSource({
      url: 'https://example.com/chart.pmtiles',
    });
    const grid = source.getTileGrid();
    expect(grid?.getMaxZoom()).toBe(15);
    expect(grid?.getZForResolution((grid?.getResolution(15) ?? 0) / 4)).toBe(
      15
    );

    const tile = source.getTile(15, 0, 0, 1);
    expect(tile).not.toBeNull();
    tile?.load();
    await vi.waitFor(() => expect(tile?.getState()).toBe(TileState.LOADED));
    const image = tile?.getData();
    expect(image).toBeInstanceOf(HTMLCanvasElement);
    expect((image as HTMLCanvasElement).width).toBe(256);
    expect((image as HTMLCanvasElement).height).toBe(256);
  });

  it('preserves chart images', async () => {
    const image = document.createElement('img');
    loadTile.mockResolvedValue(image);
    const source = new NOAAChartSource({
      url: 'https://example.com/chart.pmtiles',
    });
    const tile = source.getTile(15, 0, 0, 1);
    tile?.load();
    await vi.waitFor(() => expect(tile?.getState()).toBe(TileState.LOADED));
    expect(tile?.getData()).toBe(image);
  });

  it('preserves tile load errors', async () => {
    loadTile.mockRejectedValue(new Error('archive unavailable'));
    const source = new NOAAChartSource({
      url: 'https://example.com/chart.pmtiles',
    });
    const tile = source.getTile(15, 0, 0, 1);
    tile?.load();
    await vi.waitFor(() => expect(tile?.getState()).toBe(TileState.ERROR));
  });
});
