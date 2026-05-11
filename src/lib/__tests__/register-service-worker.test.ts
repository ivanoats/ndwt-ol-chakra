import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerServiceWorker } from '../register-service-worker';

// Save and restore the navigator.serviceWorker patch we apply per
// test so order-of-execution doesn't matter. `vi.stubEnv` handles
// NODE_ENV restoration automatically via `vi.unstubAllEnvs()`.
let originalServiceWorker: ServiceWorkerContainer | undefined;

beforeEach(() => {
  originalServiceWorker = navigator.serviceWorker;
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalServiceWorker === undefined) {
    delete (navigator as { serviceWorker?: ServiceWorkerContainer })
      .serviceWorker;
  } else {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
    });
  }
});

function mockServiceWorker(
  register: (path: string) => Promise<ServiceWorkerRegistration>
): void {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register },
    configurable: true,
  });
}

describe('registerServiceWorker', () => {
  it('is a no-op in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const register = vi.fn();
    mockServiceWorker(register);

    await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('is a no-op when navigator.serviceWorker is absent (older browsers / SSR)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete (navigator as { serviceWorker?: ServiceWorkerContainer })
      .serviceWorker;

    // Should not throw despite no SW support.
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('registers /sw.js in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const register = vi
      .fn<(path: string) => Promise<ServiceWorkerRegistration>>()
      .mockResolvedValue({} as ServiceWorkerRegistration);
    mockServiceWorker(register);

    await registerServiceWorker();
    expect(register).toHaveBeenCalledExactlyOnceWith('/sw.js');
  });

  it('swallows registration failures so the page keeps loading', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const register = vi
      .fn<(path: string) => Promise<ServiceWorkerRegistration>>()
      .mockRejectedValue(new Error('insecure context'));
    mockServiceWorker(register);

    // The map works without the SW, just without offline caching —
    // a registration failure must not bubble up.
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});
