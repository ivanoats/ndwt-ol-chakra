'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { css } from 'styled-system/css';

import { useTileHealth } from '../store/tile-health';

import { BASE_MAPS, type BaseMapId } from './LayerSwitcher';
import { classify, suggestFallback } from './tile-health-tracker';

interface TileHealthBannerProps {
  readonly activeLayer: BaseMapId;
  readonly activeLayerLabel: string;
  readonly onSwitchTo: (id: BaseMapId) => void;
}

// Top-center banner over the map. Sits high enough to clear the
// LayerSwitcher (top-left) and OL zoom controls; auto-disappears when
// the active layer recovers.
const bannerClass = css({
  position: 'absolute',
  top: '4',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 110,
  maxWidth: 'min(560px, calc(100% - 8rem))',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '2',
  padding: '3',
  borderRadius: 'md',
  boxShadow: 'md',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  borderWidth: '1px',
  borderColor: 'colorPalette.7',
  fontSize: 'sm',
  lineHeight: 'snug',
  colorPalette: 'amber',
});

const iconClass = css({
  flexShrink: 0,
  marginTop: '0.5',
  color: 'colorPalette.9',
});

const labelClass = css({
  fontWeight: 'semibold',
});

const switchBtnClass = css({
  marginTop: '2',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '1.5',
  paddingInline: '3',
  borderRadius: 'sm',
  cursor: 'pointer',
  fontSize: 'sm',
  fontWeight: 'semibold',
  backgroundColor: 'colorPalette.9',
  color: 'colorPalette.contrast',
  borderWidth: '1px',
  borderColor: 'colorPalette.9',
  _hover: { backgroundColor: 'colorPalette.10' },
  _focusVisible: {
    outline: '2px solid',
    outlineColor: 'colorPalette.9',
    outlineOffset: '2px',
  },
});

// Time-based classification (e.g. "no successful tile in 10s") needs
// the component to re-render even when no new events arrive. Tick at
// a coarse interval — 2 s is fine for human-perceived latency and
// keeps wakeups cheap.
const TICK_MS = 2000;

const BASE_MAP_IDS: readonly BaseMapId[] = BASE_MAPS.map((b) => b.id);

const labelFor = (id: BaseMapId): string =>
  BASE_MAPS.find((b) => b.id === id)?.label ?? id;

export default function TileHealthBanner({
  activeLayer,
  activeLayerLabel,
  onSwitchTo,
}: TileHealthBannerProps) {
  const health = useTileHealth((s) => s.health[activeLayer]);
  const allHealth = useTileHealth((s) => s.health);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = globalThis.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => globalThis.clearInterval(id);
  }, []);

  const status = health === undefined ? 'unknown' : classify(health, now);
  if (status === 'unknown' || status === 'ok') return null;

  const message =
    status === 'down'
      ? `${activeLayerLabel} isn't loading right now. The tile service might be temporarily down — try a different basemap from the layers menu.`
      : `${activeLayerLabel} is having trouble loading some tiles.`;

  // Only offer the one-click switch when the active layer is fully
  // down — a 'degraded' layer is still usable and a forced swap
  // would be more disruptive than helpful. `suggestFallback` returns
  // null if every other basemap is also down, in which case there's
  // nowhere good to send the user. The helper is generic over the id
  // type so no cast is needed.
  const fallbackId =
    status === 'down'
      ? suggestFallback(activeLayer, allHealth, BASE_MAP_IDS, now)
      : null;

  return (
    // Outer wrapper carries the test/data attributes for selectors
    // and the visual styling, but no live-region role. The textual
    // status lives in an inner <output> (implicit role="status" +
    // aria-live="polite"); the fallback button sits as a sibling
    // outside that live region so screen readers don't repeatedly
    // announce the button when state ticks. Pattern recommended by
    // WAI-ARIA: keep interactive controls outside aria-live regions.
    <div
      data-testid="tile-health-banner"
      data-status={status}
      className={bannerClass}
    >
      <AlertTriangle size={20} className={iconClass} aria-hidden="true" />
      <div>
        <output>
          <div className={labelClass}>
            {status === 'down' ? 'Basemap unavailable' : 'Slow connection'}
          </div>
          <div>{message}</div>
        </output>
        {fallbackId !== null && (
          <button
            type="button"
            className={switchBtnClass}
            data-testid="tile-health-fallback-button"
            onClick={() => onSwitchTo(fallbackId)}
          >
            Switch to {labelFor(fallbackId)}
          </button>
        )}
      </div>
    </div>
  );
}
