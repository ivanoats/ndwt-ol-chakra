import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import MapSettingsDrawer from '../MapSettingsDrawer';

// Mock the tile-cache module — these tests cover the drawer's wiring,
// not the cache helpers themselves (those have their own suite).
const getCacheStats = vi.fn();
const clearTileCaches = vi.fn();
const prewarmTiles = vi.fn();
const tileUrlsForMap = vi.fn();

vi.mock('../../lib/tile-cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/tile-cache')>();
  return {
    ...actual,
    getCacheStats: (...args: unknown[]) =>
      getCacheStats(...args) as ReturnType<typeof actual.getCacheStats>,
    clearTileCaches: (...args: unknown[]) =>
      clearTileCaches(...args) as ReturnType<typeof actual.clearTileCaches>,
    prewarmTiles: (...args: unknown[]) =>
      prewarmTiles(...args) as ReturnType<typeof actual.prewarmTiles>,
    tileUrlsForMap: (...args: unknown[]) =>
      tileUrlsForMap(...args) as ReturnType<typeof actual.tileUrlsForMap>,
  };
});

beforeEach(() => {
  getCacheStats.mockReset().mockResolvedValue({
    tileCount: 12,
    byteEstimate: 4_500_000,
  });
  clearTileCaches.mockReset().mockResolvedValue(1);
  prewarmTiles
    .mockReset()
    .mockResolvedValue({ total: 3, fetched: 3, failed: 0, ok: true });
  tileUrlsForMap.mockReset().mockReturnValue(['a', 'b', 'c']);
});

afterEach(() => {
  delete (globalThis as { __ndwtMap?: unknown }).__ndwtMap;
});

describe('<MapSettingsDrawer />', () => {
  it('loads cache stats when opened and renders the tile count + size', async () => {
    render(<MapSettingsDrawer open onClose={() => {}} />);

    expect(getCacheStats).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByTestId('cache-tile-count')).toHaveTextContent(
        '12 tiles'
      );
    });
    expect(screen.getByTestId('cache-byte-estimate')).toHaveTextContent(
      /4\.3 MB of storage used/
    );
  });

  it('does not load stats while the drawer is closed', () => {
    render(<MapSettingsDrawer open={false} onClose={() => {}} />);
    expect(getCacheStats).not.toHaveBeenCalled();
  });

  it('refreshes stats when the user clicks Refresh', async () => {
    render(<MapSettingsDrawer open onClose={() => {}} />);
    await waitFor(() => expect(getCacheStats).toHaveBeenCalledTimes(1));

    // Bump the mocked value so we can confirm the readout updates.
    getCacheStats.mockResolvedValueOnce({
      tileCount: 99,
      byteEstimate: 9 * 1024 * 1024,
    });
    fireEvent.click(screen.getByTestId('cache-refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('cache-tile-count')).toHaveTextContent(
        '99 tiles'
      );
    });
  });

  it('clears caches when the user clicks Clear cached tiles', async () => {
    render(<MapSettingsDrawer open onClose={() => {}} />);
    await waitFor(() => expect(getCacheStats).toHaveBeenCalledTimes(1));

    // After clearing, the next stats read should reflect an empty cache.
    getCacheStats.mockResolvedValueOnce({ tileCount: 0, byteEstimate: 0 });
    fireEvent.click(screen.getByTestId('cache-clear'));

    await waitFor(() => expect(clearTileCaches).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByTestId('cache-cleared-status')).toHaveTextContent(
        /Cleared/
      );
    });
  });

  it('disables Clear when the cache is already empty', async () => {
    getCacheStats.mockResolvedValueOnce({ tileCount: 0, byteEstimate: 0 });
    render(<MapSettingsDrawer open onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('cache-tile-count')).toHaveTextContent(
        '0 tiles'
      );
    });
    expect(screen.getByTestId('cache-clear')).toBeDisabled();
  });

  it('pre-warms the current viewport when Save current view is clicked', async () => {
    (globalThis as { __ndwtMap?: object }).__ndwtMap = {
      // Sentinel — tileUrlsForMap is mocked, so the contents don't matter.
    };

    render(<MapSettingsDrawer open onClose={() => {}} />);
    await waitFor(() => expect(getCacheStats).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId('cache-prewarm'));

    await waitFor(() => expect(prewarmTiles).toHaveBeenCalledTimes(1));
    expect(tileUrlsForMap).toHaveBeenCalledTimes(1);
    expect(prewarmTiles.mock.calls[0]?.[0]).toEqual(['a', 'b', 'c']);

    await waitFor(() => {
      expect(screen.getByTestId('prewarm-done-status')).toHaveTextContent(
        /Saved 3 tiles/
      );
    });
  });

  it('reports failures inline when some tiles fail to pre-warm', async () => {
    (globalThis as { __ndwtMap?: object }).__ndwtMap = {};
    prewarmTiles.mockResolvedValueOnce({
      total: 5,
      fetched: 5,
      failed: 2,
      ok: false,
    });

    render(<MapSettingsDrawer open onClose={() => {}} />);
    await waitFor(() => expect(getCacheStats).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('cache-prewarm'));

    await waitFor(() => {
      expect(screen.getByTestId('prewarm-done-status')).toHaveTextContent(
        /Saved 3 of 5 tiles \(2 failed\)/
      );
    });
  });

  it('skips pre-warm silently when no map handle is exposed', async () => {
    delete (globalThis as { __ndwtMap?: unknown }).__ndwtMap;
    render(<MapSettingsDrawer open onClose={() => {}} />);
    await waitFor(() => expect(getCacheStats).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByTestId('cache-prewarm'));
    });

    expect(tileUrlsForMap).not.toHaveBeenCalled();
    expect(prewarmTiles).not.toHaveBeenCalled();
  });
});
