import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import type { LayerKey } from '../../store/tile-health';
import { useTileHealth } from '../../store/tile-health';
import { DOWN_AFTER_CONSECUTIVE_ERRORS } from '../tile-health-tracker';
import TileHealthBanner from '../TileHealthBanner';

beforeEach(() => {
  useTileHealth.setState({ health: {} });
});

const repeatRecord = (
  layer: LayerKey,
  kind: 'success' | 'error',
  count: number
): void => {
  const action =
    kind === 'success'
      ? useTileHealth.getState().recordSuccess
      : useTileHealth.getState().recordError;
  Array.from({ length: count }).forEach(() => action(layer));
};

const NOOP = (): void => {
  /* unused in tests that don't exercise the switch button */
};

describe('<TileHealthBanner />', () => {
  it('renders nothing when no tile events have been recorded for the layer', () => {
    render(
      <TileHealthBanner
        activeLayer="osm"
        activeLayerLabel="Street Map"
        onSwitchTo={NOOP}
      />
    );
    expect(screen.queryByTestId('tile-health-banner')).not.toBeInTheDocument();
  });

  it('renders nothing while the active layer is healthy', () => {
    useTileHealth.getState().recordSuccess('osm');
    render(
      <TileHealthBanner
        activeLayer="osm"
        activeLayerLabel="Street Map"
        onSwitchTo={NOOP}
      />
    );
    expect(screen.queryByTestId('tile-health-banner')).not.toBeInTheDocument();
  });

  it('shows the "down" banner when the active layer crosses the threshold', () => {
    repeatRecord('osm', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
    render(
      <TileHealthBanner
        activeLayer="osm"
        activeLayerLabel="Street Map"
        onSwitchTo={NOOP}
      />
    );

    const banner = screen.getByTestId('tile-health-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('data-status', 'down');
    expect(banner).toHaveTextContent(/Basemap unavailable/);
    expect(banner).toHaveTextContent(/Street Map/);
  });

  it('uses the activeLayerLabel in the banner copy', () => {
    repeatRecord('aerial', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
    render(
      <TileHealthBanner
        activeLayer="aerial"
        activeLayerLabel="Aerial Imagery"
        onSwitchTo={NOOP}
      />
    );

    expect(screen.getByTestId('tile-health-banner')).toHaveTextContent(
      /Aerial Imagery/
    );
  });

  it('only reflects the active layer — a different failing layer is ignored', () => {
    // OSM is failing, but the user is currently on USGS Topo.
    repeatRecord('osm', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
    useTileHealth.getState().recordSuccess('usgs');

    render(
      <TileHealthBanner
        activeLayer="usgs"
        activeLayerLabel="USGS Topo"
        onSwitchTo={NOOP}
      />
    );
    expect(screen.queryByTestId('tile-health-banner')).not.toBeInTheDocument();
  });

  it('shows the degraded banner copy when status is "degraded"', () => {
    repeatRecord('osm', 'success', 6);
    repeatRecord('osm', 'error', 4);

    render(
      <TileHealthBanner
        activeLayer="osm"
        activeLayerLabel="Street Map"
        onSwitchTo={NOOP}
      />
    );

    const banner = screen.getByTestId('tile-health-banner');
    expect(banner).toHaveAttribute('data-status', 'degraded');
    expect(banner).toHaveTextContent(/Slow connection/);
  });

  describe('switch-to-fallback button', () => {
    it('renders a switch button when down and a healthy alternative exists', () => {
      // Active layer (OSM) is down; USGS has at least one successful
      // load so it qualifies as the fallback.
      repeatRecord('osm', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
      useTileHealth.getState().recordSuccess('usgs');

      render(
        <TileHealthBanner
          activeLayer="osm"
          activeLayerLabel="Street Map"
          onSwitchTo={NOOP}
        />
      );

      const button = screen.getByTestId('tile-health-fallback-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(/Switch to USGS Topo/);
    });

    it('calls onSwitchTo with the suggested layer id when clicked', () => {
      repeatRecord('osm', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
      useTileHealth.getState().recordSuccess('usgs');
      const onSwitchTo = vi.fn();

      render(
        <TileHealthBanner
          activeLayer="osm"
          activeLayerLabel="Street Map"
          onSwitchTo={onSwitchTo}
        />
      );

      fireEvent.click(screen.getByTestId('tile-health-fallback-button'));
      expect(onSwitchTo).toHaveBeenCalledWith('usgs');
    });

    it('does not render the switch button when status is only degraded', () => {
      // Degraded layers are still usable; a forced switch would be
      // more disruptive than helpful.
      repeatRecord('osm', 'success', 6);
      repeatRecord('osm', 'error', 4);

      render(
        <TileHealthBanner
          activeLayer="osm"
          activeLayerLabel="Street Map"
          onSwitchTo={NOOP}
        />
      );

      expect(
        screen.queryByTestId('tile-health-fallback-button')
      ).not.toBeInTheDocument();
    });

    it('does not render the switch button when every other basemap is also down', () => {
      // No healthy fallback exists — suggestFallback returns null.
      repeatRecord('osm', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
      repeatRecord('usgs', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
      repeatRecord('opentopomap', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
      repeatRecord('aerial', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);
      repeatRecord('noaa-charts', 'error', DOWN_AFTER_CONSECUTIVE_ERRORS);

      render(
        <TileHealthBanner
          activeLayer="osm"
          activeLayerLabel="Street Map"
          onSwitchTo={NOOP}
        />
      );

      expect(screen.getByTestId('tile-health-banner')).toBeInTheDocument();
      expect(
        screen.queryByTestId('tile-health-fallback-button')
      ).not.toBeInTheDocument();
    });
  });
});
