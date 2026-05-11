'use client';

import { Layers } from 'lucide-react';
import { useEffect, useState } from 'react';
import { css } from 'styled-system/css';

import { useTileHealth } from '../store/tile-health';

import { classify, type HealthStatus } from './tile-health-tracker';

export type BaseMapId = 'osm' | 'usgs' | 'opentopomap' | 'aerial';
export type OverlayId = 'openseamap' | 'hiking';

interface LayerSwitcherProps {
  readonly activeBaseMap: BaseMapId;
  readonly activeOverlays: ReadonlySet<OverlayId>;
  readonly onBaseMapChange: (id: BaseMapId) => void;
  readonly onOverlayToggle: (id: OverlayId) => void;
}

// Exported so other components (e.g. the tile-health banner) can
// resolve a layer's display label from its id without duplicating the
// list.
export const BASE_MAPS: ReadonlyArray<{ id: BaseMapId; label: string }> = [
  { id: 'osm', label: 'Street Map' },
  { id: 'usgs', label: 'USGS Topo' },
  { id: 'opentopomap', label: 'OpenTopoMap' },
  { id: 'aerial', label: 'Aerial Imagery' },
];

const OVERLAYS: Array<{ id: OverlayId; label: string }> = [
  { id: 'openseamap', label: 'Sea Marks' },
  { id: 'hiking', label: 'Hiking Trails' },
];

// Sit below OL's default zoom control (top-left, ~60 px tall) so
// the toggle button doesn't cover the +/− buttons.
const panelClass = css({
  position: 'absolute',
  top: '20',
  left: '2',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '1',
});

const toggleBtnClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '10',
  height: '10',
  borderRadius: 'md',
  cursor: 'pointer',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  boxShadow: 'sm',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  _hover: { backgroundColor: 'bg.muted' },
  _focusVisible: {
    outline: '2px solid',
    outlineColor: 'colorPalette.9',
    outlineOffset: '2px',
  },
  colorPalette: 'green',
});

const dropdownClass = css({
  marginTop: '1',
  backgroundColor: 'bg.default',
  borderRadius: 'md',
  boxShadow: 'md',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  padding: '3',
  minWidth: '160px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
});

const sectionLabelClass = css({
  fontSize: 'xs',
  fontWeight: 'semibold',
  textTransform: 'uppercase',
  letterSpacing: 'wide',
  color: 'fg.muted',
  marginBottom: '1',
});

const layerBtnClass = (active: boolean) =>
  css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    width: '100%',
    padding: '1.5',
    borderRadius: 'sm',
    cursor: 'pointer',
    fontSize: 'sm',
    fontWeight: active ? 'semibold' : 'normal',
    color: active ? 'colorPalette.11' : 'fg.default',
    backgroundColor: active ? 'colorPalette.3' : 'transparent',
    borderWidth: '1px',
    borderColor: active ? 'colorPalette.7' : 'transparent',
    _hover: { backgroundColor: active ? 'colorPalette.4' : 'bg.muted' },
    _focusVisible: {
      outline: '2px solid',
      outlineColor: 'colorPalette.9',
      outlineOffset: '2px',
    },
    colorPalette: 'green',
  });

const dividerClass = css({
  borderWidth: '0',
  borderTopWidth: '1px',
  borderColor: 'border.subtle',
  margin: '0',
});

// Health dot: pushed to the right of the button via marginLeft auto.
// Color reflects the layer's current tile-health classification.
// Hidden from screen readers — the `title` provides hover-tooltip
// context and the surrounding banner already announces failures.
const healthDotClass = (status: HealthStatus) =>
  css({
    marginLeft: 'auto',
    width: '2',
    height: '2',
    borderRadius: 'full',
    flexShrink: 0,
    backgroundColor:
      status === 'down'
        ? 'red.9'
        : status === 'degraded'
          ? 'amber.9'
          : status === 'ok'
            ? 'green.9'
            : 'gray.6',
    opacity: status === 'unknown' ? 0.35 : 1,
  });

const HEALTH_TITLES: Record<HealthStatus, string> = {
  ok: 'Tiles loading',
  degraded: 'Slow / partial tile loads',
  down: 'Tile service unavailable',
  unknown: 'No tile loads yet',
};

// Re-tick at the same cadence as the banner so time-based
// classifications (e.g. "no successful tile in 10s") age the dots
// even when no new events arrive.
const TICK_MS = 2000;

export default function LayerSwitcher({
  activeBaseMap,
  activeOverlays,
  onBaseMapChange,
  onOverlayToggle,
}: LayerSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const allHealth = useTileHealth((s) => s.health);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = globalThis.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => globalThis.clearInterval(id);
  }, []);

  const statusFor = (id: BaseMapId | OverlayId): HealthStatus => {
    const entry = allHealth[id];
    return entry === undefined ? 'unknown' : classify(entry, now);
  };

  return (
    <div className={panelClass}>
      <button
        type="button"
        aria-label="Toggle layer switcher"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={toggleBtnClass}
      >
        <Layers size={20} />
      </button>

      {isOpen && (
        <div className={dropdownClass} role="group" aria-label="Map layers">
          <p className={sectionLabelClass}>Base Map</p>
          {BASE_MAPS.map(({ id, label }) => {
            const status = statusFor(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={activeBaseMap === id}
                onClick={() => onBaseMapChange(id)}
                className={layerBtnClass(activeBaseMap === id)}
              >
                <span aria-hidden="true">
                  {activeBaseMap === id ? '● ' : '○ '}
                </span>
                {label}
                <span
                  aria-hidden="true"
                  title={HEALTH_TITLES[status]}
                  data-testid={`health-dot-${id}`}
                  data-status={status}
                  className={healthDotClass(status)}
                />
              </button>
            );
          })}

          <hr className={dividerClass} />

          <p className={sectionLabelClass}>Overlays</p>
          {OVERLAYS.map(({ id, label }) => {
            const status = statusFor(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={activeOverlays.has(id)}
                onClick={() => onOverlayToggle(id)}
                className={layerBtnClass(activeOverlays.has(id))}
              >
                <span aria-hidden="true">
                  {activeOverlays.has(id) ? '☑ ' : '☐ '}
                </span>
                {label}
                <span
                  aria-hidden="true"
                  title={HEALTH_TITLES[status]}
                  data-testid={`health-dot-${id}`}
                  data-status={status}
                  className={healthDotClass(status)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
