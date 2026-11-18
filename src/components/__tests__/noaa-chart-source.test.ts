import TileState from 'ol/TileState';
import { type Header, PMTiles } from 'pmtiles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NOAAChartSource } from '../noaa-chart-source';

describe('NOAAChartSource', () => {
  beforeEach(() => {
    vi.spyOn(PMTiles.prototype, 'getHeader').mockResolvedValue({
      minZoom: 0,
      maxZoom: 15,
    } as Header);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders missing tiles as transparent images', async () => {
    vi.spyOn(PMTiles.prototype, 'getZxy').mockImplementation(() =>
      Promise.resolve().then(() => undefined)
    );
    const source = new NOAAChartSource({
      url: 'https://example.com/chart.pmtiles',
    });
    await vi.waitFor(() => expect(source.getState()).toBe('ready'));
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
    vi.spyOn(PMTiles.prototype, 'getZxy').mockResolvedValue({
      data: new Uint8Array([1]).buffer,
    });
    const source = new NOAAChartSource({
      url: 'https://example.com/chart.pmtiles',
    });
    vi.spyOn(source, 'loadImage').mockResolvedValue(image);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:chart'),
      revokeObjectURL: vi.fn(),
    });
    try {
      await vi.waitFor(() => expect(source.getState()).toBe('ready'));
      const tile = source.getTile(15, 0, 0, 1);
      tile?.load();
      await vi.waitFor(() => expect(tile?.getState()).toBe(TileState.LOADED));
      expect(tile?.getData()).toBe(image);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('preserves tile load errors', async () => {
    vi.spyOn(PMTiles.prototype, 'getZxy').mockRejectedValue(
      new Error('archive unavailable')
    );
    const source = new NOAAChartSource({
      url: 'https://example.com/chart.pmtiles',
    });
    await vi.waitFor(() => expect(source.getState()).toBe('ready'));
    const tile = source.getTile(15, 0, 0, 1);
    tile?.load();
    await vi.waitFor(() => expect(tile?.getState()).toBe(TileState.ERROR));
  });
});
