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
    <div>
      <header
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '3xl',
        })}
      >
        <p
          className={css({
            fontSize: { base: '14px', sm: '18px', md: '24px', lg: '30px' },
            margin: 0,
            color: 'fg.default',
          })}
        >
          Northwest Discovery Water Trail
        </p>
        <MapComponent sites={sites} getSite={composition.getSite} />
      </header>
      <SiteInfoPanel />
      <ThemeToggleButton />
    </div>
  );
}
