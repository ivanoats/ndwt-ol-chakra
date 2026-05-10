import { create } from 'zustand';

import type { LayerHealth } from '../components/tile-health-tracker';
import { EMPTY_HEALTH, recordEvent } from '../components/tile-health-tracker';

export type LayerKey = string;

interface TileHealthState {
  health: Record<LayerKey, LayerHealth>;
  recordSuccess: (layer: LayerKey) => void;
  recordError: (layer: LayerKey) => void;
  reset: (layer: LayerKey) => void;
}

export const useTileHealth = create<TileHealthState>((set) => ({
  health: {},
  recordSuccess: (layer) =>
    set((s) => ({
      health: {
        ...s.health,
        [layer]: recordEvent(
          s.health[layer] ?? EMPTY_HEALTH,
          'success',
          Date.now()
        ),
      },
    })),
  recordError: (layer) =>
    set((s) => ({
      health: {
        ...s.health,
        [layer]: recordEvent(
          s.health[layer] ?? EMPTY_HEALTH,
          'error',
          Date.now()
        ),
      },
    })),
  reset: (layer) =>
    set((s) => ({ health: { ...s.health, [layer]: EMPTY_HEALTH } })),
}));
