// Pure tile-health classification logic. Lives outside the Zustand
// store so it can be unit-tested in jsdom without touching React or
// OpenLayers — the store and the OL listeners just feed it events
// and read its verdict.

export type TileLoadEvent = {
  readonly kind: 'success' | 'error';
  readonly at: number;
};

export type HealthStatus = 'unknown' | 'ok' | 'degraded' | 'down';

export interface LayerHealth {
  readonly events: readonly TileLoadEvent[];
  readonly consecutiveErrors: number;
  readonly lastSuccessAt: number | null;
}

export const EMPTY_HEALTH: LayerHealth = Object.freeze({
  events: [],
  consecutiveErrors: 0,
  lastSuccessAt: null,
});

// Rolling window — 20 events covers ~5–10 panned tile batches at
// typical zooms. Bigger window = slower to react to recovery; smaller
// = noisier classification.
export const WINDOW_SIZE = 20;

// Hard "down" trigger. Five consecutive errors with no successes in
// the last 10 s is unambiguous — the layer is broken right now.
export const DOWN_AFTER_CONSECUTIVE_ERRORS = 5;
export const DOWN_NO_SUCCESS_FOR_MS = 10_000;

// Degraded threshold — 30% errors in the recent window. High enough
// that a single failed tile during a busy pan doesn't trip it.
export const DEGRADED_ERROR_RATIO = 0.3;

export function recordEvent(
  state: LayerHealth,
  kind: 'success' | 'error',
  now: number
): LayerHealth {
  const events = [...state.events, { kind, at: now }].slice(-WINDOW_SIZE);
  return {
    events,
    consecutiveErrors: kind === 'error' ? state.consecutiveErrors + 1 : 0,
    lastSuccessAt: kind === 'success' ? now : state.lastSuccessAt,
  };
}

export function classify(state: LayerHealth, now: number): HealthStatus {
  if (state.events.length === 0) return 'unknown';

  const noRecentSuccess =
    state.lastSuccessAt === null ||
    now - state.lastSuccessAt > DOWN_NO_SUCCESS_FOR_MS;

  if (
    state.consecutiveErrors >= DOWN_AFTER_CONSECUTIVE_ERRORS &&
    noRecentSuccess
  ) {
    return 'down';
  }

  const errorCount = state.events.filter((e) => e.kind === 'error').length;
  if (errorCount / state.events.length > DEGRADED_ERROR_RATIO) {
    return 'degraded';
  }

  return 'ok';
}
