import { describe, expect, it } from 'vitest';

import {
  classify,
  DEGRADED_ERROR_RATIO,
  DOWN_AFTER_CONSECUTIVE_ERRORS,
  DOWN_NO_SUCCESS_FOR_MS,
  EMPTY_HEALTH,
  type LayerHealth,
  MIN_EVENTS_FOR_DEGRADED,
  recordEvent,
  WINDOW_SIZE,
} from '../tile-health-tracker';

const T0 = 1_700_000_000_000; // arbitrary fixed wall-clock for determinism
const PAST = (ms: number) => T0 - ms;
const FUTURE = (ms: number) => T0 + ms;

function feedEvents(
  start: LayerHealth,
  kind: 'success' | 'error',
  count: number,
  at: number
): LayerHealth {
  return Array.from({ length: count }).reduce<LayerHealth>(
    (state) => recordEvent(state, kind, at),
    start
  );
}

describe('recordEvent', () => {
  it('starts from EMPTY_HEALTH with no events', () => {
    expect(EMPTY_HEALTH.events).toHaveLength(0);
    expect(EMPTY_HEALTH.consecutiveErrors).toBe(0);
    expect(EMPTY_HEALTH.lastSuccessAt).toBeNull();
  });

  it('appends a success event and updates lastSuccessAt', () => {
    const next = recordEvent(EMPTY_HEALTH, 'success', T0);
    expect(next.events).toHaveLength(1);
    expect(next.events[0]).toEqual({ kind: 'success', at: T0 });
    expect(next.lastSuccessAt).toBe(T0);
    expect(next.consecutiveErrors).toBe(0);
  });

  it('increments consecutiveErrors on errors, resets on success', () => {
    const after2err = feedEvents(EMPTY_HEALTH, 'error', 2, T0);
    expect(after2err.consecutiveErrors).toBe(2);

    const afterRecover = recordEvent(after2err, 'success', T0 + 100);
    expect(afterRecover.consecutiveErrors).toBe(0);
    expect(afterRecover.lastSuccessAt).toBe(T0 + 100);
  });

  it('keeps lastSuccessAt unchanged when an error follows a success', () => {
    const successful = recordEvent(EMPTY_HEALTH, 'success', T0);
    const thenErrored = recordEvent(successful, 'error', T0 + 50);
    expect(thenErrored.lastSuccessAt).toBe(T0);
  });

  it('caps the events buffer at WINDOW_SIZE', () => {
    const flooded = feedEvents(EMPTY_HEALTH, 'success', WINDOW_SIZE + 5, T0);
    expect(flooded.events).toHaveLength(WINDOW_SIZE);
  });

  it('drops oldest events first when window overflows', () => {
    // Mark the first event distinctly so we can detect its eviction.
    const seeded = recordEvent(EMPTY_HEALTH, 'error', T0);
    const filled = feedEvents(seeded, 'success', WINDOW_SIZE, T0 + 1);
    expect(filled.events).toHaveLength(WINDOW_SIZE);
    expect(filled.events.every((event) => event.kind === 'success')).toBe(true);
  });

  it('does not mutate the input state', () => {
    const before = recordEvent(EMPTY_HEALTH, 'success', T0);
    const beforeSnapshot = JSON.stringify(before);
    recordEvent(before, 'error', T0 + 100);
    expect(JSON.stringify(before)).toBe(beforeSnapshot);
  });
});

describe('classify', () => {
  it('reports unknown when no events recorded yet', () => {
    expect(classify(EMPTY_HEALTH, T0)).toBe('unknown');
  });

  it('reports ok after a single successful tile load', () => {
    const single = recordEvent(EMPTY_HEALTH, 'success', T0);
    expect(classify(single, T0)).toBe('ok');
  });

  it('reports degraded when error ratio exceeds the threshold (with enough events)', () => {
    // 4 errors + 6 successes = 40% errors, above the 30% threshold,
    // and 10 events ≥ MIN_EVENTS_FOR_DEGRADED.
    const withSuccesses = feedEvents(EMPTY_HEALTH, 'success', 6, T0);
    const mixed = feedEvents(withSuccesses, 'error', 4, T0 + 6);
    const ratio =
      mixed.events.filter((event) => event.kind === 'error').length /
      mixed.events.length;
    expect(ratio).toBeGreaterThan(DEGRADED_ERROR_RATIO);
    expect(mixed.events.length).toBeGreaterThanOrEqual(MIN_EVENTS_FOR_DEGRADED);
    expect(classify(mixed, T0 + 100)).toBe('degraded');
  });

  it('does not classify as degraded with fewer than MIN_EVENTS_FOR_DEGRADED events', () => {
    // A single early failure (1/1 = 100% errors) shouldn't trip the
    // degraded banner — the minimum-events floor exists for this.
    const oneError = recordEvent(EMPTY_HEALTH, 'error', T0);
    expect(oneError.events.length).toBeLessThan(MIN_EVENTS_FOR_DEGRADED);
    expect(classify(oneError, T0 + 100)).not.toBe('degraded');
  });

  it('stays ok when error ratio is below the threshold', () => {
    // 2 errors + 8 successes = 20% errors, below 30% threshold
    const withSuccesses = feedEvents(EMPTY_HEALTH, 'success', 8, T0);
    const mixed = feedEvents(withSuccesses, 'error', 2, T0 + 8);
    expect(classify(mixed, T0 + 100)).toBe('ok');
  });

  it('reports down on consecutive errors with no recent success', () => {
    const allErrors = feedEvents(
      EMPTY_HEALTH,
      'error',
      DOWN_AFTER_CONSECUTIVE_ERRORS,
      PAST(DOWN_NO_SUCCESS_FOR_MS + 1)
    );
    expect(classify(allErrors, T0)).toBe('down');
  });

  it('does not report down if a success arrived within the recovery window', () => {
    // 5 errors but a success was just recorded — recovery resets the
    // consecutiveErrors counter to 0, so it cannot be 'down'.
    const allErrors = feedEvents(
      EMPTY_HEALTH,
      'error',
      DOWN_AFTER_CONSECUTIVE_ERRORS,
      T0
    );
    const recovered = recordEvent(allErrors, 'success', T0 + 100);
    expect(classify(recovered, T0 + 200)).not.toBe('down');
  });

  it('does not report down if consecutive errors are below the threshold', () => {
    const fewErrors = feedEvents(
      EMPTY_HEALTH,
      'error',
      DOWN_AFTER_CONSECUTIVE_ERRORS - 1,
      T0
    );
    expect(classify(fewErrors, FUTURE(DOWN_NO_SUCCESS_FOR_MS + 1))).not.toBe(
      'down'
    );
  });

  it('escalates from degraded to down as more consecutive errors accumulate', () => {
    const oldSuccess = recordEvent(
      EMPTY_HEALTH,
      'success',
      PAST(DOWN_NO_SUCCESS_FOR_MS + 1)
    );
    const sustainedErrors = feedEvents(
      oldSuccess,
      'error',
      DOWN_AFTER_CONSECUTIVE_ERRORS,
      T0
    );
    expect(classify(sustainedErrors, T0 + 100)).toBe('down');
  });

  it('recovers to ok once the rolling window fills with successes', () => {
    const downState = feedEvents(
      EMPTY_HEALTH,
      'error',
      DOWN_AFTER_CONSECUTIVE_ERRORS,
      PAST(DOWN_NO_SUCCESS_FOR_MS + 1)
    );
    expect(classify(downState, T0)).toBe('down');

    const recovered = feedEvents(downState, 'success', WINDOW_SIZE, T0);
    expect(classify(recovered, T0 + 1)).toBe('ok');
  });
});
