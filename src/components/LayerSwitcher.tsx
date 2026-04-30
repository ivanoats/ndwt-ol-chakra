'use client';

import { Layers } from 'lucide-react';
import { useState } from 'react';
import { css } from 'styled-system/css';

export type BaseMapId = 'osm' | 'usgs' | 'opentopomap';
export type OverlayId = 'openseamap' | 'hiking';

interface LayerSwitcherProps {
  readonly activeBaseMap: BaseMapId;
  readonly activeOverlays: ReadonlySet<OverlayId>;
  readonly onBaseMapChange: (id: BaseMapId) => void;
  readonly onOverlayToggle: (id: OverlayId) => void;
}

const BASE_MAPS: Array<{ id: BaseMapId; label: string }> = [
  { id: 'osm', label: 'Street Map' },
  { id: 'usgs', label: 'USGS Topo' },
  { id: 'opentopomap', label: 'OpenTopoMap' },
];

const OVERLAYS: Array<{ id: OverlayId; label: string }> = [
  { id: 'openseamap', label: 'Sea Marks' },
  { id: 'hiking', label: 'Hiking Trails' },
];

// Sit below OL's default zoom control (top-left, ~60 px tall) so
// the toggle button doesn't cover the +/− buttons.
const panelClass = css({
  position: 'absolute',
  top: '20',
  left: '2',
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '1',
});

const toggleBtnClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '10',
  height: '10',
  borderRadius: 'md',
  cursor: 'pointer',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  boxShadow: 'sm',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  _hover: { backgroundColor: 'bg.muted' },
  _focusVisible: {
    outline: '2px solid',
    outlineColor: 'colorPalette.9',
    outlineOffset: '2px',
  },
  colorPalette: 'green',
});

const dropdownClass = css({
  marginTop: '1',
  backgroundColor: 'bg.default',
  borderRadius: 'md',
  boxShadow: 'md',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  padding: '3',
  minWidth: '160px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
});

const sectionLabelClass = css({
  fontSize: 'xs',
  fontWeight: 'semibold',
  textTransform: 'uppercase',
  letterSpacing: 'wide',
  color: 'fg.muted',
  marginBottom: '1',
});

const layerBtnClass = (active: boolean) =>
  css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    width: '100%',
    padding: '1.5',
    borderRadius: 'sm',
    cursor: 'pointer',
    fontSize: 'sm',
    fontWeight: active ? 'semibold' : 'normal',
    color: active ? 'colorPalette.11' : 'fg.default',
    backgroundColor: active ? 'colorPalette.3' : 'transparent',
    borderWidth: '1px',
    borderColor: active ? 'colorPalette.7' : 'transparent',
    _hover: { backgroundColor: active ? 'colorPalette.4' : 'bg.muted' },
    _focusVisible: {
      outline: '2px solid',
      outlineColor: 'colorPalette.9',
      outlineOffset: '2px',
    },
    colorPalette: 'green',
  });

const dividerClass = css({
  borderWidth: '0',
  borderTopWidth: '1px',
  borderColor: 'border.subtle',
  margin: '0',
});

export default function LayerSwitcher({
  activeBaseMap,
  activeOverlays,
  onBaseMapChange,
  onOverlayToggle,
}: LayerSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={panelClass}>
      <button
        type="button"
        aria-label="Toggle layer switcher"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={toggleBtnClass}
      >
        <Layers size={20} />
      </button>

      {isOpen && (
        <div className={dropdownClass} role="group" aria-label="Map layers">
          <p className={sectionLabelClass}>Base Map</p>
          {BASE_MAPS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={activeBaseMap === id}
              onClick={() => onBaseMapChange(id)}
              className={layerBtnClass(activeBaseMap === id)}
            >
              <span aria-hidden="true">
                {activeBaseMap === id ? '● ' : '○ '}
              </span>
              {label}
            </button>
          ))}

          <hr className={dividerClass} />

          <p className={sectionLabelClass}>Overlays</p>
          {OVERLAYS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={activeOverlays.has(id)}
              onClick={() => onOverlayToggle(id)}
              className={layerBtnClass(activeOverlays.has(id))}
            >
              <span aria-hidden="true">
                {activeOverlays.has(id) ? '☑ ' : '☐ '}
              </span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
