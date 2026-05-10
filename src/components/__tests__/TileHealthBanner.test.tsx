import { beforeEach, describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import { useTileHealth } from '../../store/tile-health';
import { DOWN_AFTER_CONSECUTIVE_ERRORS } from '../tile-health-tracker';
import TileHealthBanner from '../TileHealthBanner';

beforeEach(() => {
  useTileHealth.setState({ health: {} });
});

describe('<TileHealthBanner />', () => {
  it('renders nothing when no tile events have been recorded for the layer', () => {
    render(
      <TileHealthBanner activeLayer="osm" activeLayerLabel="Street Map" />
    );
    expect(screen.queryByTestId('tile-health-banner')).not.toBeInTheDocument();
  });

  it('renders nothing while the active layer is healthy', () => {
    useTileHealth.getState().recordSuccess('osm');
    render(
      <TileHealthBanner activeLayer="osm" activeLayerLabel="Street Map" />
    );
    expect(screen.queryByTestId('tile-health-banner')).not.toBeInTheDocument();
  });

  it('shows the "down" banner when the active layer crosses the threshold', () => {
    for (let i = 0; i < DOWN_AFTER_CONSECUTIVE_ERRORS; i++) {
      useTileHealth.getState().recordError('osm');
    }
    render(
      <TileHealthBanner activeLayer="osm" activeLayerLabel="Street Map" />
    );

    const banner = screen.getByTestId('tile-health-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('data-status', 'down');
    expect(banner).toHaveTextContent(/Basemap unavailable/);
    expect(banner).toHaveTextContent(/Street Map/);
  });

  it('uses the activeLayerLabel in the banner copy', () => {
    for (let i = 0; i < DOWN_AFTER_CONSECUTIVE_ERRORS; i++) {
      useTileHealth.getState().recordError('aerial');
    }
    render(
      <TileHealthBanner
        activeLayer="aerial"
        activeLayerLabel="Aerial Imagery"
      />
    );

    expect(screen.getByTestId('tile-health-banner')).toHaveTextContent(
      /Aerial Imagery/
    );
  });

  it('only reflects the active layer — a different failing layer is ignored', () => {
    // OSM is failing, but the user is currently on USGS Topo.
    for (let i = 0; i < DOWN_AFTER_CONSECUTIVE_ERRORS; i++) {
      useTileHealth.getState().recordError('osm');
    }
    useTileHealth.getState().recordSuccess('usgs');

    render(
      <TileHealthBanner activeLayer="usgs" activeLayerLabel="USGS Topo" />
    );
    expect(screen.queryByTestId('tile-health-banner')).not.toBeInTheDocument();
  });

  it('shows the degraded banner copy when status is "degraded"', () => {
    // 4 errors + 6 successes = 40% errors, above the 30% degraded
    // threshold but consecutiveErrors=4 stays under the 5-error
    // "down" threshold.
    for (let i = 0; i < 6; i++) {
      useTileHealth.getState().recordSuccess('osm');
    }
    for (let i = 0; i < 4; i++) {
      useTileHealth.getState().recordError('osm');
    }

    render(
      <TileHealthBanner activeLayer="osm" activeLayerLabel="Street Map" />
    );

    const banner = screen.getByTestId('tile-health-banner');
    expect(banner).toHaveAttribute('data-status', 'degraded');
    expect(banner).toHaveTextContent(/Slow connection/);
  });
});
