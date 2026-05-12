'use client';

import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { css } from 'styled-system/css';

// Small persistent pill at the bottom-center of the map. Appears
// whenever the browser reports it's offline; auto-hides on
// reconnect. Pairs with the tile-cache service worker — combined,
// the map keeps working from cached tiles and the user has clear
// feedback that they're operating from cache.
//
// Position: bottom-center, away from the LayerSwitcher (top-left),
// the tile-health banner (top-center), and OL's attribution
// control (bottom-right). Uses the same `<output>` + implicit
// role="status" / aria-live="polite" pattern as the health banner
// — non-interruptive announcement on transition.

const pillClass = css({
  position: 'absolute',
  bottom: '4',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 110,
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  padding: '2',
  paddingInline: '3',
  borderRadius: 'full',
  boxShadow: 'sm',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  borderWidth: '1px',
  borderColor: 'colorPalette.7',
  fontSize: 'sm',
  fontWeight: 'medium',
  colorPalette: 'amber',
});

const iconClass = css({
  flexShrink: 0,
  color: 'colorPalette.9',
});

export default function OfflineIndicator() {
  // Lazy-init from `navigator.onLine` so a page that mounts while
  // already offline shows the pill immediately. Default to `true`
  // (online) for SSR / non-browser test environments where
  // `navigator` is undefined or `onLine` is unreliable.
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const update = (): void => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (isOnline) return null;

  return (
    <output data-testid="offline-indicator" className={pillClass}>
      <WifiOff size={16} className={iconClass} aria-hidden="true" />
      Offline — showing cached tiles
    </output>
  );
}
