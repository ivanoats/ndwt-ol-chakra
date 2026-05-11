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
  // Wall-clock timestamp of the most recent "down" trigger. Once
  // set, classify keeps reporting 'down' for DOWN_PERSIST_MS even
  // if a few sporadic successes arrive — this suppresses banner
  // flapping during a flaky outage. Cleared implicitly when the
  // persistence window elapses (classify just stops honouring it).
  readonly downSince: number | null;
}

export const EMPTY_HEALTH: LayerHealth = Object.freeze({
  // Object.freeze is shallow — also freeze the array so an
  // accidental `EMPTY_HEALTH.events.push(...)` from a caller can't
  // poison this shared singleton.
  events: Object.freeze([] as TileLoadEvent[]),
  consecutiveErrors: 0,
  lastSuccessAt: null,
  downSince: null,
});

// Rolling window — 20 events covers ~5–10 panned tile batches at
// typical zooms. Bigger window = slower to react to recovery; smaller
// = noisier classification.
export const WINDOW_SIZE = 20;

// Hard "down" trigger. Five consecutive errors with no successes in
// the last 10 s is unambiguous — the layer is broken right now.
export const DOWN_AFTER_CONSECUTIVE_ERRORS = 5;
export const DOWN_NO_SUCCESS_FOR_MS = 10_000;

// Degraded threshold — 30% errors in the recent window AND at least
// MIN_EVENTS_FOR_DEGRADED events recorded. The floor avoids a single
// transient failure on initial load (1/1 = 100% > 30%) tripping the
// banner before we have enough samples to call the layer degraded.
export const DEGRADED_ERROR_RATIO = 0.3;
export const MIN_EVENTS_FOR_DEGRADED = 5;

// Once a layer is classified 'down', stay 'down' for at least this
// long even if intermittent successes arrive. Stops the banner from
// flapping during a flaky outage. Tuned to 5 minutes — long enough
// for users to notice and switch basemap, short enough that a true
// recovery surfaces quickly.
export const DOWN_PERSIST_MS = 5 * 60_000;

export function recordEvent(
  state: LayerHealth,
  kind: 'success' | 'error',
  now: number
): LayerHealth {
  const events = [...state.events, { kind, at: now }].slice(-WINDOW_SIZE);
  const consecutiveErrors = kind === 'error' ? state.consecutiveErrors + 1 : 0;
  const lastSuccessAt = kind === 'success' ? now : state.lastSuccessAt;

  // Latch / refresh the sticky-down timestamp whenever we're sitting
  // at or above the consecutive-error threshold. Overwriting `now`
  // every time errors come in extends the persistence window for
  // sustained outages but leaves it untouched (and eventually
  // expiring) once errors stop.
  const downSince =
    consecutiveErrors >= DOWN_AFTER_CONSECUTIVE_ERRORS ? now : state.downSince;

  return { events, consecutiveErrors, lastSuccessAt, downSince };
}

export function classify(state: LayerHealth, now: number): HealthStatus {
  if (state.events.length === 0) return 'unknown';

  // Sticky down: keep reporting 'down' for the persistence window
  // after the most recent down trigger, even if a few successes
  // have arrived since.
  if (state.downSince !== null && now - state.downSince < DOWN_PERSIST_MS) {
    return 'down';
  }

  // Fresh down check — catches the case where the persistence
  // window has elapsed but the layer is still actively failing.
  const noRecentSuccess =
    state.lastSuccessAt === null ||
    now - state.lastSuccessAt > DOWN_NO_SUCCESS_FOR_MS;

  if (
    state.consecutiveErrors >= DOWN_AFTER_CONSECUTIVE_ERRORS &&
    noRecentSuccess
  ) {
    return 'down';
  }

  if (state.events.length >= MIN_EVENTS_FOR_DEGRADED) {
    const errorCount = state.events.filter((e) => e.kind === 'error').length;
    if (errorCount / state.events.length > DEGRADED_ERROR_RATIO) {
      return 'degraded';
    }
  }

  return 'ok';
}

// Pick the best alternative basemap to suggest when the active
// layer is down. Returns null if every other candidate is also
// down. Prefers 'ok' over 'unknown' over 'degraded'; never
// suggests a layer that's currently 'down' itself.
const FALLBACK_PREFERENCE: Record<HealthStatus, number> = {
  ok: 0,
  unknown: 1,
  degraded: 2,
  down: 3,
};

export function suggestFallback(
  active: string,
  healths: Readonly<Partial<Record<string, LayerHealth>>>,
  candidates: readonly string[],
  now: number
): string | null {
  const ranked = candidates
    .filter((id) => id !== active)
    .map((id) => {
      const entry = healths[id];
      const status: HealthStatus =
        entry === undefined ? 'unknown' : classify(entry, now);
      return { id, status };
    })
    .filter((c) => c.status !== 'down')
    .sort(
      (a, b) => FALLBACK_PREFERENCE[a.status] - FALLBACK_PREFERENCE[b.status]
    );

  return ranked[0]?.id ?? null;
}
