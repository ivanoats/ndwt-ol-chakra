'use client';

import type { Map as OlMap } from 'ol';
import { useCallback, useEffect, useState } from 'react';
import { css } from 'styled-system/css';

import {
  type CacheStats,
  clearTileCaches,
  formatBytes,
  getCacheStats,
  type PrewarmProgress,
  prewarmTiles,
  tileUrlsForMap,
} from '../lib/tile-cache';

import { Button } from './ui/button';
import { Drawer, DrawerBody, DrawerHeader } from './ui/drawer';

// "Save current view" + "Clear cached tiles" sit behind the gear icon
// from MapSettingsButton. Reads the OL map handle off `globalThis`
// (the same one map.tsx exposes for Playwright) — keeps this drawer
// fully decoupled from the dynamic-imported map module.

type GlobalWithMap = typeof globalThis & { __ndwtMap?: OlMap };

interface MapSettingsDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

type Status =
  | { readonly kind: 'idle' }
  | { readonly kind: 'prewarming'; readonly progress: PrewarmProgress }
  | { readonly kind: 'prewarm-done'; readonly progress: PrewarmProgress }
  | { readonly kind: 'clearing' }
  | { readonly kind: 'cleared' };

const initialStats: CacheStats = { tileCount: 0, byteEstimate: 0 };

const sectionClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  paddingY: '4',
  borderBottomWidth: '1px',
  borderColor: 'gray.6',
  _last: { borderBottomWidth: '0' },
});

const sectionHeadingClass = css({
  fontSize: 'sm',
  fontWeight: 'semibold',
  color: 'fg.default',
  textTransform: 'uppercase',
  letterSpacing: 'wide',
});

const helpTextClass = css({
  fontSize: 'sm',
  color: 'fg.muted',
  lineHeight: 'snug',
});

const statRowClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
});

const statValueClass = css({
  fontSize: 'lg',
  fontWeight: 'medium',
  color: 'fg.default',
});

const actionsRowClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2',
});

const statusLineClass = css({
  fontSize: 'sm',
  color: 'fg.muted',
  marginTop: '1',
});

// Sub-components keep the JSX shallow so the deep-nesting linter
// (DeepSource JS-0415) stays quiet at 4 levels max. Each section is
// independently testable too.

interface CacheSectionProps {
  readonly stats: CacheStats;
  readonly status: Status;
  readonly onRefresh: () => void;
  readonly onClear: () => void;
}

function CacheSection({
  stats,
  status,
  onRefresh,
  onClear,
}: CacheSectionProps) {
  const tilesLabel = `${stats.tileCount} tile${stats.tileCount === 1 ? '' : 's'}`;
  return (
    <section className={sectionClass} aria-labelledby="settings-cache-heading">
      <h3 id="settings-cache-heading" className={sectionHeadingClass}>
        Offline tile cache
      </h3>
      <p className={helpTextClass}>
        Tiles you&apos;ve already viewed are stored in your browser so the map
        keeps working when you lose signal.
      </p>
      <CacheReadout
        tilesLabel={tilesLabel}
        bytesLabel={`~${formatBytes(stats.byteEstimate)} of storage used`}
      />
      <CacheActions
        onRefresh={onRefresh}
        onClear={onClear}
        clearDisabled={status.kind === 'clearing' || stats.tileCount === 0}
      />
      {status.kind === 'clearing' ? (
        <p className={statusLineClass}>Clearing…</p>
      ) : null}
      {status.kind === 'cleared' ? (
        <p className={statusLineClass} data-testid="cache-cleared-status">
          Cleared.
        </p>
      ) : null}
    </section>
  );
}

interface CacheReadoutProps {
  readonly tilesLabel: string;
  readonly bytesLabel: string;
}

function CacheReadout({ tilesLabel, bytesLabel }: CacheReadoutProps) {
  return (
    <div className={statRowClass}>
      <span className={statValueClass} data-testid="cache-tile-count">
        {tilesLabel}
      </span>
      <span className={helpTextClass} data-testid="cache-byte-estimate">
        {bytesLabel}
      </span>
    </div>
  );
}

interface CacheActionsProps {
  readonly onRefresh: () => void;
  readonly onClear: () => void;
  readonly clearDisabled: boolean;
}

function CacheActions({
  onRefresh,
  onClear,
  clearDisabled,
}: CacheActionsProps) {
  return (
    <div className={actionsRowClass}>
      <Button
        data-testid="cache-refresh"
        variant="outline"
        size="sm"
        onClick={onRefresh}
      >
        Refresh
      </Button>
      <Button
        data-testid="cache-clear"
        variant="outline"
        size="sm"
        colorScheme="gray"
        onClick={onClear}
        disabled={clearDisabled}
      >
        Clear cached tiles
      </Button>
    </div>
  );
}

interface PrewarmSectionProps {
  readonly status: Status;
  readonly onPrewarm: () => void;
}

function PrewarmSection({ status, onPrewarm }: PrewarmSectionProps) {
  return (
    <section
      className={sectionClass}
      aria-labelledby="settings-prewarm-heading"
    >
      <h3 id="settings-prewarm-heading" className={sectionHeadingClass}>
        Pre-load this view
      </h3>
      <p className={helpTextClass}>
        Cache every tile in the current viewport for the basemap and overlays
        you have on. Do this while you have WiFi so the map still works on the
        river.
      </p>
      <PrewarmAction
        onPrewarm={onPrewarm}
        disabled={status.kind === 'prewarming'}
      />
      <PrewarmStatusLine status={status} />
    </section>
  );
}

interface PrewarmActionProps {
  readonly onPrewarm: () => void;
  readonly disabled: boolean;
}

function PrewarmAction({ onPrewarm, disabled }: PrewarmActionProps) {
  return (
    <div className={actionsRowClass}>
      <Button
        data-testid="cache-prewarm"
        variant="solid"
        size="sm"
        onClick={onPrewarm}
        disabled={disabled}
      >
        Save current view for offline use
      </Button>
    </div>
  );
}

function PrewarmStatusLine({ status }: { readonly status: Status }) {
  if (status.kind === 'prewarming') {
    const failNote =
      status.progress.failed > 0 ? ` (${status.progress.failed} failed)` : '';
    return (
      <p className={statusLineClass} data-testid="prewarm-progress">
        Caching {status.progress.fetched} / {status.progress.total} tiles
        {failNote}…
      </p>
    );
  }
  if (status.kind === 'prewarm-done') {
    const { total, failed } = status.progress;
    const tileWord = total === 1 ? 'tile' : 'tiles';
    const message =
      failed === 0
        ? `Saved ${total} ${tileWord}.`
        : `Saved ${total - failed} of ${total} ${tileWord} (${failed} failed).`;
    return (
      <p className={statusLineClass} data-testid="prewarm-done-status">
        {message}
      </p>
    );
  }
  return null;
}

export default function MapSettingsDrawer({
  open,
  onClose,
}: MapSettingsDrawerProps) {
  const [stats, setStats] = useState<CacheStats>(initialStats);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const refreshStats = useCallback(async () => {
    const next = await getCacheStats();
    setStats(next);
  }, []);

  // Refresh the stats whenever the drawer opens so the readout
  // matches reality (the cache may have grown since last open via
  // tiles loaded from the visible map).
  useEffect(() => {
    if (!open) return;
    refreshStats();
  }, [open, refreshStats]);

  const handleClear = useCallback(async () => {
    setStatus({ kind: 'clearing' });
    await clearTileCaches();
    await refreshStats();
    setStatus({ kind: 'cleared' });
  }, [refreshStats]);

  const handlePrewarm = useCallback(async () => {
    const map = (globalThis as GlobalWithMap).__ndwtMap;
    if (map === undefined) {
      // No map handle means the map hasn't mounted yet. Bail
      // silently — the gear button won't render until MapApp is
      // mounted, but a race is theoretically possible.
      return;
    }
    const urls = tileUrlsForMap(map);
    setStatus({
      kind: 'prewarming',
      progress: { total: urls.length, fetched: 0, failed: 0 },
    });
    const result = await prewarmTiles(urls, {
      onProgress: (progress) => setStatus({ kind: 'prewarming', progress }),
    });
    setStatus({ kind: 'prewarm-done', progress: result });
    await refreshStats();
  }, [refreshStats]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      testId="map-settings-drawer"
    >
      <DrawerHeader>
        <h2
          className={css({
            fontSize: 'lg',
            fontWeight: 'semibold',
            color: 'fg.default',
          })}
        >
          Map settings
        </h2>
      </DrawerHeader>
      <DrawerBody>
        <CacheSection
          stats={stats}
          status={status}
          onRefresh={() => {
            refreshStats();
          }}
          onClear={() => {
            handleClear();
          }}
        />
        <PrewarmSection
          status={status}
          onPrewarm={() => {
            handlePrewarm();
          }}
        />
      </DrawerBody>
    </Drawer>
  );
}
