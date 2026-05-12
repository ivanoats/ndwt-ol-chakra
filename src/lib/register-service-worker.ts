// Service-worker registration entry point. Called once from MapApp
// when the component first mounts in the browser. Hides the dance of
// feature detection, dev-mode skip, and registration error handling
// so the caller is a one-liner.

const SW_PATH = '/sw.js';

export async function registerServiceWorker(): Promise<void> {
  // Bail in non-browser environments (SSR, tests without DOM).
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // SWs only work on HTTPS and localhost. In dev mode (next dev),
  // Next's HMR layer doesn't play well with SW caching of app
  // assets either, so we skip registration entirely. The SW is
  // scoped to tiles, not app assets, so this is conservative —
  // re-enable for dev later if needed for testing.
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_PATH);
  } catch {
    // Registration failures shouldn't surface to users — the map
    // still works without the SW, just without offline caching.
    // (Future: route this to a structured telemetry endpoint.)
  }
}
