'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';
import { css } from 'styled-system/css';

import { createComposition } from '../composition-root';
import type { Site } from '../domain';
import { useSelectedSite } from '../store/selected-site';

import SiteInfoPanel from './panels/SiteInfoPanel';
import ThemeToggleButton from './ThemeToggleButton';

// OpenLayers touches `window` at import time, so dynamic-import with
// ssr: false; static export still works because Next pre-renders the
// shell and the map mounts on the client.
const MapComponent = dynamic(() => import('./map'), { ssr: false });

interface MapAppProps {
  readonly sites: readonly Site[];
}

const SITE_QUERY_KEY = 'site';

/**
 * Two-way URL sync for the selected site.
 *
 * - On mount, read `?site=<slug>` and select the matching site so a
 *   shared link opens the panel deterministically.
 * - On every selectedSite change, mirror the state into the URL via
 *   `history.replaceState` (no Next router round-trip → no re-render,
 *   no scroll jump). Selecting a marker pushes `?site=<slug>`;
 *   closing the drawer strips it.
 */
const useSiteUrlSync = (sites: readonly Site[]) => {
  const selectedSite = useSelectedSite((s) => s.selectedSite);

  // Initial-load deep-link: runs once after mount.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get(
      SITE_QUERY_KEY
    );
    if (slug === null || slug === '') return;
    const site = sites.find((s) => s.slug === slug);
    if (site !== undefined) useSelectedSite.getState().select(site);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link is one-shot
  }, []);

  // Mirror selection back into the URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedSite === null) {
      url.searchParams.delete(SITE_QUERY_KEY);
    } else {
      url.searchParams.set(SITE_QUERY_KEY, selectedSite.slug);
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (
      next !==
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    ) {
      window.history.replaceState(null, '', next);
    }
  }, [selectedSite]);
};

export default function MapApp({ sites }: MapAppProps) {
  const composition = useMemo(() => createComposition(sites), [sites]);
  useSiteUrlSync(sites);

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
