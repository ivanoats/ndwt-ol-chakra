import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import { useTileHealth } from '../../store/tile-health';
import LayerSwitcher, {
  type BaseMapId,
  type OverlayId,
} from '../LayerSwitcher';
import { DOWN_AFTER_CONSECUTIVE_ERRORS } from '../tile-health-tracker';

const DEFAULT_OVERLAYS: ReadonlySet<OverlayId> = new Set<OverlayId>([
  'openseamap',
]);

beforeEach(() => {
  useTileHealth.setState({ health: {} });
});

describe('<LayerSwitcher />', () => {
  it('renders the toggle button', () => {
    render(
      <LayerSwitcher
        activeBaseMap="osm"
        activeOverlays={DEFAULT_OVERLAYS}
        onBaseMapChange={vi.fn()}
        onOverlayToggle={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Toggle layer switcher' })
    ).toBeInTheDocument();
  });

  it('opens the panel when the toggle button is clicked', () => {
    render(
      <LayerSwitcher
        activeBaseMap="osm"
        activeOverlays={DEFAULT_OVERLAYS}
        onBaseMapChange={vi.fn()}
        onOverlayToggle={vi.fn()}
      />
    );
    const toggle = screen.getByRole('button', {
      name: 'Toggle layer switcher',
    });
    fireEvent.click(toggle);

    expect(
      screen.getByRole('group', { name: 'Map layers' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Street Map/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /USGS Topo/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /OpenTopoMap/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Aerial Imagery/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sea Marks/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Hiking Trails/ })
    ).toBeInTheDocument();
  });

  it('marks the active base map as pressed', () => {
    render(
      <LayerSwitcher
        activeBaseMap="usgs"
        activeOverlays={new Set<OverlayId>()}
        onBaseMapChange={vi.fn()}
        onOverlayToggle={vi.fn()}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle layer switcher' })
    );

    expect(screen.getByRole('button', { name: /USGS Topo/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /Street Map/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls onBaseMapChange when a base map button is clicked', () => {
    const onBaseMapChange = vi.fn();
    render(
      <LayerSwitcher
        activeBaseMap="osm"
        activeOverlays={new Set<OverlayId>()}
        onBaseMapChange={onBaseMapChange}
        onOverlayToggle={vi.fn()}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle layer switcher' })
    );
    fireEvent.click(screen.getByRole('button', { name: /OpenTopoMap/ }));

    expect(onBaseMapChange).toHaveBeenCalledWith(
      'opentopomap' satisfies BaseMapId
    );
  });

  it('calls onBaseMapChange with "aerial" when Aerial Imagery is clicked', () => {
    const onBaseMapChange = vi.fn();
    render(
      <LayerSwitcher
        activeBaseMap="osm"
        activeOverlays={new Set<OverlayId>()}
        onBaseMapChange={onBaseMapChange}
        onOverlayToggle={vi.fn()}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle layer switcher' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Aerial Imagery/ }));

    expect(onBaseMapChange).toHaveBeenCalledWith('aerial' satisfies BaseMapId);
  });

  it('marks active overlays as pressed', () => {
    render(
      <LayerSwitcher
        activeBaseMap="osm"
        activeOverlays={DEFAULT_OVERLAYS}
        onBaseMapChange={vi.fn()}
        onOverlayToggle={vi.fn()}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle layer switcher' })
    );

    expect(screen.getByRole('button', { name: /Sea Marks/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByRole('button', { name: /Hiking Trails/ })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onOverlayToggle when an overlay button is clicked', () => {
    const onOverlayToggle = vi.fn();
    render(
      <LayerSwitcher
        activeBaseMap="osm"
        activeOverlays={new Set<OverlayId>()}
        onBaseMapChange={vi.fn()}
        onOverlayToggle={onOverlayToggle}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle layer switcher' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Hiking Trails/ }));

    expect(onOverlayToggle).toHaveBeenCalledWith('hiking' satisfies OverlayId);
  });

  it('closes the panel when the toggle button is clicked again', () => {
    render(
      <LayerSwitcher
        activeBaseMap="osm"
        activeOverlays={new Set<OverlayId>()}
        onBaseMapChange={vi.fn()}
        onOverlayToggle={vi.fn()}
      />
    );
    const toggle = screen.getByRole('button', {
      name: 'Toggle layer switcher',
    });
    fireEvent.click(toggle);
    expect(
      screen.getByRole('group', { name: 'Map layers' })
    ).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(
      screen.queryByRole('group', { name: 'Map layers' })
    ).not.toBeInTheDocument();
  });

  describe('health dots', () => {
    const openPanel = (): void => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Toggle layer switcher' })
      );
    };

    it('renders an unknown-status dot for every layer before any tile events', () => {
      render(
        <LayerSwitcher
          activeBaseMap="osm"
          activeOverlays={new Set<OverlayId>()}
          onBaseMapChange={vi.fn()}
          onOverlayToggle={vi.fn()}
        />
      );
      openPanel();

      for (const id of ['osm', 'usgs', 'opentopomap', 'aerial'] as const) {
        const dot = screen.getByTestId(`health-dot-${id}`);
        expect(dot).toHaveAttribute('data-status', 'unknown');
      }
    });

    it('reflects per-layer health: ok for layers with successes, down for failing layers', () => {
      // OSM: 5 errors → down. USGS: 1 success → ok.
      Array.from({ length: DOWN_AFTER_CONSECUTIVE_ERRORS }).forEach(() =>
        useTileHealth.getState().recordError('osm')
      );
      useTileHealth.getState().recordSuccess('usgs');

      render(
        <LayerSwitcher
          activeBaseMap="osm"
          activeOverlays={new Set<OverlayId>()}
          onBaseMapChange={vi.fn()}
          onOverlayToggle={vi.fn()}
        />
      );
      openPanel();

      expect(screen.getByTestId('health-dot-osm')).toHaveAttribute(
        'data-status',
        'down'
      );
      expect(screen.getByTestId('health-dot-usgs')).toHaveAttribute(
        'data-status',
        'ok'
      );
    });

    it('renders health dots for overlays as well as basemaps', () => {
      render(
        <LayerSwitcher
          activeBaseMap="osm"
          activeOverlays={new Set<OverlayId>()}
          onBaseMapChange={vi.fn()}
          onOverlayToggle={vi.fn()}
        />
      );
      openPanel();

      expect(screen.getByTestId('health-dot-openseamap')).toBeInTheDocument();
      expect(screen.getByTestId('health-dot-hiking')).toBeInTheDocument();
    });
  });
});
