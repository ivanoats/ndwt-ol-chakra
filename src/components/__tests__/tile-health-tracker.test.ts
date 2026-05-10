import { describe, expect, it } from 'vitest';

import {
  classify,
  DEGRADED_ERROR_RATIO,
  DOWN_AFTER_CONSECUTIVE_ERRORS,
  DOWN_NO_SUCCESS_FOR_MS,
  EMPTY_HEALTH,
  type LayerHealth,
  recordEvent,
  WINDOW_SIZE,
} from '../tile-health-tracker';

const T0 = 1_700_000_000_000; // arbitrary fixed wall-clock for determinism
const PAST = (ms: number) => T0 - ms;
const FUTURE = (ms: number) => T0 + ms;

function feedSuccesses(start: LayerHealth, n: number, at: number): LayerHealth {
  let s = start;
  for (let i = 0; i < n; i++) s = recordEvent(s, 'success', at);
  return s;
}

function feedErrors(start: LayerHealth, n: number, at: number): LayerHealth {
  let s = start;
  for (let i = 0; i < n; i++) s = recordEvent(s, 'error', at);
  return s;
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
    const after2err = feedErrors(EMPTY_HEALTH, 2, T0);
    expect(after2err.consecutiveErrors).toBe(2);

    const afterRecover = recordEvent(after2err, 'success', T0 + 100);
    expect(afterRecover.consecutiveErrors).toBe(0);
    expect(afterRecover.lastSuccessAt).toBe(T0 + 100);
  });

  it('keeps lastSuccessAt unchanged when an error follows a success', () => {
    const a = recordEvent(EMPTY_HEALTH, 'success', T0);
    const b = recordEvent(a, 'error', T0 + 50);
    expect(b.lastSuccessAt).toBe(T0);
  });

  it('caps the events buffer at WINDOW_SIZE', () => {
    const flooded = feedSuccesses(EMPTY_HEALTH, WINDOW_SIZE + 5, T0);
    expect(flooded.events).toHaveLength(WINDOW_SIZE);
  });

  it('drops oldest events first when window overflows', () => {
    // Mark the first event distinctly so we can detect its eviction.
    const first = recordEvent(EMPTY_HEALTH, 'error', T0);
    const filled = feedSuccesses(first, WINDOW_SIZE, T0 + 1);
    expect(filled.events).toHaveLength(WINDOW_SIZE);
    expect(filled.events.every((e) => e.kind === 'success')).toBe(true);
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
    const s = recordEvent(EMPTY_HEALTH, 'success', T0);
    expect(classify(s, T0)).toBe('ok');
  });

  it('reports degraded when error ratio exceeds the threshold', () => {
    // 4 errors + 6 successes = 40% errors, above the 30% threshold
    let s = EMPTY_HEALTH;
    for (let i = 0; i < 6; i++) s = recordEvent(s, 'success', T0 + i);
    for (let i = 0; i < 4; i++) s = recordEvent(s, 'error', T0 + 6 + i);
    const ratio =
      s.events.filter((e) => e.kind === 'error').length / s.events.length;
    expect(ratio).toBeGreaterThan(DEGRADED_ERROR_RATIO);
    expect(classify(s, T0 + 100)).toBe('degraded');
  });

  it('stays ok when error ratio is below the threshold', () => {
    // 2 errors + 8 successes = 20% errors, below 30% threshold
    let s = EMPTY_HEALTH;
    for (let i = 0; i < 8; i++) s = recordEvent(s, 'success', T0 + i);
    for (let i = 0; i < 2; i++) s = recordEvent(s, 'error', T0 + 8 + i);
    expect(classify(s, T0 + 100)).toBe('ok');
  });

  it('reports down on consecutive errors with no recent success', () => {
    const s = feedErrors(
      EMPTY_HEALTH,
      DOWN_AFTER_CONSECUTIVE_ERRORS,
      PAST(DOWN_NO_SUCCESS_FOR_MS + 1)
    );
    expect(classify(s, T0)).toBe('down');
  });

  it('does not report down if a success arrived within the recovery window', () => {
    // 5 errors but a success was just recorded — recovery resets the
    // consecutiveErrors counter to 0, so it cannot be 'down'.
    let s = feedErrors(EMPTY_HEALTH, DOWN_AFTER_CONSECUTIVE_ERRORS, T0);
    s = recordEvent(s, 'success', T0 + 100);
    expect(classify(s, T0 + 200)).not.toBe('down');
  });

  it('does not report down if consecutive errors are below the threshold', () => {
    const s = feedErrors(EMPTY_HEALTH, DOWN_AFTER_CONSECUTIVE_ERRORS - 1, T0);
    expect(classify(s, FUTURE(DOWN_NO_SUCCESS_FOR_MS + 1))).not.toBe('down');
  });

  it('escalates from degraded to down as more consecutive errors accumulate', () => {
    let s = recordEvent(
      EMPTY_HEALTH,
      'success',
      PAST(DOWN_NO_SUCCESS_FOR_MS + 1)
    );
    for (let i = 0; i < DOWN_AFTER_CONSECUTIVE_ERRORS; i++) {
      s = recordEvent(s, 'error', T0 + i);
    }
    expect(classify(s, T0 + 100)).toBe('down');
  });

  it('recovers to ok once the rolling window fills with successes', () => {
    const downState = feedErrors(
      EMPTY_HEALTH,
      DOWN_AFTER_CONSECUTIVE_ERRORS,
      PAST(DOWN_NO_SUCCESS_FOR_MS + 1)
    );
    expect(classify(downState, T0)).toBe('down');

    const recovered = feedSuccesses(downState, WINDOW_SIZE, T0);
    expect(classify(recovered, T0 + 1)).toBe('ok');
  });
});
