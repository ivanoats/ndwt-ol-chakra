'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { css } from 'styled-system/css';

import { useTileHealth } from '../store/tile-health';

import type { BaseMapId } from './LayerSwitcher';
import { classify } from './tile-health-tracker';

interface TileHealthBannerProps {
  readonly activeLayer: BaseMapId;
  readonly activeLayerLabel: string;
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

// Time-based classification (e.g. "no successful tile in 10s") needs
// the component to re-render even when no new events arrive. Tick at
// a coarse interval — 2 s is fine for human-perceived latency and
// keeps wakeups cheap.
const TICK_MS = 2000;

export default function TileHealthBanner({
  activeLayer,
  activeLayerLabel,
}: TileHealthBannerProps) {
  const health = useTileHealth((s) => s.health[activeLayer]);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const status = health === undefined ? 'unknown' : classify(health, now);
  if (status === 'unknown' || status === 'ok') return null;

  const message =
    status === 'down'
      ? `${activeLayerLabel} isn't loading right now. The tile service might be temporarily down — try a different basemap from the layers menu.`
      : `${activeLayerLabel} is having trouble loading some tiles.`;

  return (
    // role="status" implies aria-live="polite" — non-interruptive
    // announcement that doesn't preempt the user's current task.
    // role="alert" would force assertive interruption, which is the
    // wrong tone for "your basemap is slow."
    <div
      role="status"
      data-testid="tile-health-banner"
      data-status={status}
      className={bannerClass}
    >
      <AlertTriangle size={20} className={iconClass} aria-hidden="true" />
      <div>
        <div className={labelClass}>
          {status === 'down' ? 'Basemap unavailable' : 'Slow connection'}
        </div>
        <div>{message}</div>
      </div>
    </div>
  );
}
