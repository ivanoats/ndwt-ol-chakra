import { beforeEach, describe, expect, it } from 'vitest';

import { EMPTY_HEALTH } from '../../components/tile-health-tracker';
import { useTileHealth } from '../tile-health';

// Reset the (otherwise process-shared) Zustand state between tests
// so each one starts from a known empty store.
beforeEach(() => {
  useTileHealth.setState({ health: {} });
});

describe('useTileHealth', () => {
  it('starts with no per-layer health', () => {
    expect(useTileHealth.getState().health).toEqual({});
  });

  it('recordSuccess seeds a new layer entry and stamps a success', () => {
    expect(useTileHealth.getState().health['osm']).toBeUndefined();

    useTileHealth.getState().recordSuccess('osm');
    const entry = useTileHealth.getState().health['osm'];

    expect(entry).toBeDefined();
    expect(entry?.events).toHaveLength(1);
    expect(entry?.events[0]?.kind).toBe('success');
    expect(entry?.lastSuccessAt).not.toBeNull();
    expect(entry?.consecutiveErrors).toBe(0);
  });

  it('recordError increments consecutiveErrors and leaves lastSuccessAt unchanged', () => {
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordError('osm');

    const entry = useTileHealth.getState().health['osm'];
    expect(entry?.consecutiveErrors).toBe(2);
    expect(entry?.lastSuccessAt).toBeNull();
  });

  it('tracks each layer independently', () => {
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordSuccess('usgs');

    expect(useTileHealth.getState().health['osm']?.consecutiveErrors).toBe(2);
    expect(useTileHealth.getState().health['usgs']?.consecutiveErrors).toBe(0);
    expect(useTileHealth.getState().health['usgs']?.events).toHaveLength(1);
  });

  it('reset clears a single layer back to EMPTY_HEALTH without touching others', () => {
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordSuccess('usgs');

    useTileHealth.getState().reset('osm');

    expect(useTileHealth.getState().health['osm']).toEqual(EMPTY_HEALTH);
    // 'usgs' state unchanged.
    expect(useTileHealth.getState().health['usgs']?.events).toHaveLength(1);
  });

  it('a recovery success after errors resets consecutiveErrors to 0', () => {
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordError('osm');
    useTileHealth.getState().recordSuccess('osm');

    expect(useTileHealth.getState().health['osm']?.consecutiveErrors).toBe(0);
    expect(useTileHealth.getState().health['osm']?.events).toHaveLength(4);
  });
});
