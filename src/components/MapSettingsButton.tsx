'use client';

import { Settings } from 'lucide-react';

import { IconButton } from './ui/icon-button';

// Gear icon — top-right corner of the map. Currently the only floating
// control over there (LayerSwitcher is top-left, TileHealthBanner is
// top-center, OfflineIndicator is bottom-center, OL attribution is
// bottom-right inside the map). Clicking opens the cache + offline
// settings drawer.

interface MapSettingsButtonProps {
  readonly onClick: () => void;
}

export default function MapSettingsButton({ onClick }: MapSettingsButtonProps) {
  return (
    <IconButton
      data-testid="map-settings-button"
      aria-label="Open map settings"
      onClick={onClick}
      icon={<Settings size={20} />}
      css={{
        position: 'absolute',
        top: '4',
        right: '4',
        zIndex: 100,
        backgroundColor: 'bg.default',
      }}
    />
  );
}
