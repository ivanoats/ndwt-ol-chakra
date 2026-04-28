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
    // The root layout's <main> is a flex column; this container
    // takes whatever space is left after the Hero strip via
    // `flex: 1`, with a min-height so short viewports still get a
    // usable map area. No magic numbers.
    <div
      className={css({
        flex: 1,
        position: 'relative',
        display: 'flex',
        width: '100%',
        minHeight: '480px',
      })}
    >
      <MapComponent sites={sites} getSite={composition.getSite} />
      <SiteInfoPanel />
      <ThemeToggleButton />
    </div>
  );
}
