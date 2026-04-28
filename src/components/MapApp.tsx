'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { css } from 'styled-system/css';

import { createComposition } from '../composition-root';
import type { Site } from '../domain';

import SiteInfoPanel from './panels/SiteInfoPanel';
import ThemeToggleButton from './ThemeToggleButton';

// OpenLayers touches `window` at import time, so dynamic-import with
// ssr: false; static export still works because Next pre-renders the
// shell and the map mounts on the client.
const MapComponent = dynamic(() => import('./map'), { ssr: false });

interface MapAppProps {
  readonly sites: readonly Site[];
}

export default function MapApp({ sites }: MapAppProps) {
  const composition = useMemo(() => createComposition(sites), [sites]);

  return (
    // Map fills the viewport remainder below the sticky header
    // and the hero strip. Hero is roughly 80–120px depending on
    // breakpoint; subtracting 220px from 100dvh leaves a generous
    // map area without consuming all scroll on tall screens, and
    // the min-height guards short windows.
    <div
      className={css({
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: 'calc(100dvh - var(--header-height) - 140px)',
        minHeight: '480px',
      })}
    >
      <MapComponent sites={sites} getSite={composition.getSite} />
      <SiteInfoPanel />
      <ThemeToggleButton />
    </div>
  );
}
