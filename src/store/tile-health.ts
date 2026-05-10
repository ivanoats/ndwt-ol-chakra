import { create } from 'zustand';

import type { BaseMapId, OverlayId } from '../components/LayerSwitcher';
import type { LayerHealth } from '../components/tile-health-tracker';
import { EMPTY_HEALTH, recordEvent } from '../components/tile-health-tracker';

// Restricting LayerKey to the actual layer ids prevents recording
// health under a misspelled / unsupported key — call sites get a
// type error instead of silently growing a dead entry in the store.
export type LayerKey = BaseMapId | OverlayId;

// Health entries are populated lazily as the first tile event for a
// layer arrives, so the record is partial.
interface TileHealthState {
  health: Partial<Record<LayerKey, LayerHealth>>;
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
