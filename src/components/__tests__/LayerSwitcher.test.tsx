import { describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import LayerSwitcher, {
  type BaseMapId,
  type OverlayId,
} from '../LayerSwitcher';

const DEFAULT_OVERLAYS: ReadonlySet<OverlayId> = new Set<OverlayId>([
  'openseamap',
]);

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
});
