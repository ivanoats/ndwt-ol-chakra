import { expect, test } from '@playwright/test';

// Single source of truth for the host list the SW intercepts. Keep
// in sync with TILE_HOSTS in public/sw.js — if drift happens the
// scope-correctness test below will fail loudly. The regex and the
// allowed-host check used in the scope test are both derived from
// this list so we only have one place to update.
const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'basemap.nationalmap.gov',
  'a.tile.opentopomap.org',
  'b.tile.opentopomap.org',
  'c.tile.opentopomap.org',
  'tiles.openseamap.org',
  'tile.waymarkedtrails.org',
] as const;

// Matches every basemap / overlay tile host the SW knows about.
// Used to selectively block tile traffic at the Playwright layer
// without taking the localhost preview server offline — the
// realistic scenario is "online enough to load the app, tile hosts
// unreachable", which `context.setOffline(true)` can't model
// because it kills localhost too.
const TILE_HOST_REGEX = new RegExp(
  `(?:${TILE_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')})/`
);

test.describe('Tile cache service worker', () => {
  test('caches basemap tiles and serves them after tile hosts are blocked', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for the SW to be active and controlling the page. The
    // registration runs from MapApp's first mount; `navigator.
    // serviceWorker.ready` resolves once the SW is in the active
    // state. Our activate handler calls `clients.claim()`, so the
    // current page becomes controlled without needing a reload.
    await page.evaluate(() => navigator.serviceWorker.ready);

    // OL is dynamic-imported with ssr:false, so wait for the map to
    // mount before we count tile cache entries.
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    // Give OL a moment to request the initial viewport's tiles and
    // for the SW to write them into the cache. Tile load order is
    // non-deterministic; poll until at least one tile is cached
    // rather than relying on a fixed sleep.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const names = await caches.keys();
            let total = 0;
            for (const name of names.filter((n) =>
              n.startsWith('ndwt-tiles-')
            )) {
              const cache = await caches.open(name);
              const keys = await cache.keys();
              total += keys.length;
            }
            return total;
          }),
        { timeout: 15_000 }
      )
      .toBeGreaterThan(0);

    // Block every tile host AT THE NETWORK LAYER (below the SW).
    // The page itself still loads from localhost; only the tile
    // CDNs are unreachable, which is the realistic "weak signal in
    // a canyon" scenario the SW exists to handle.
    await page.route(TILE_HOST_REGEX, (route) =>
      route.abort('internetdisconnected')
    );

    await page.reload();
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    // Canvas still renders at a real size.
    const canvas = page.locator('#map').locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (box === null) throw new Error('OL canvas should have a bounding box');
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);

    // And we never crossed into the "basemap unavailable" banner —
    // the cached tiles satisfied OL's tileload events.
    await expect(page.getByTestId('tile-health-banner')).toBeHidden();
  });

  test('SW intercepts cross-origin tile requests but lets app assets through', async ({
    page,
  }) => {
    // Verify the SW's scope: tile hosts are intercepted (cached on
    // success), but app-bundle / GeoJSON / static-asset requests
    // pass through to the browser's default handling. We assert
    // this via the cache contents — after a page load, the tile
    // cache contains entries with hostnames matching the
    // TILE_HOSTS list and nothing else (e.g. no localhost entries).
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const names = await caches.keys();
            const hosts = new Set<string>();
            for (const name of names.filter((n) =>
              n.startsWith('ndwt-tiles-')
            )) {
              const cache = await caches.open(name);
              for (const req of await cache.keys()) {
                hosts.add(new URL(req.url).hostname);
              }
            }
            return Array.from(hosts).sort();
          }),
        { timeout: 15_000 }
      )
      .not.toEqual([]);

    // Cached hostnames are exclusively the known tile hosts. (We
    // can't enumerate the exact list because OL only fetches the
    // active basemap's tiles, not every host; but every cached
    // entry MUST be a known tile host.)
    const allowedHosts = new Set<string>(TILE_HOSTS);
    // `expect.poll` returns void; re-query the value for the assert.
    const finalHosts = await page.evaluate(async () => {
      const names = await caches.keys();
      const hosts = new Set<string>();
      for (const name of names.filter((n) => n.startsWith('ndwt-tiles-'))) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          hosts.add(new URL(req.url).hostname);
        }
      }
      return Array.from(hosts);
    });
    for (const host of finalHosts) {
      expect(allowedHosts.has(host)).toBe(true);
    }
  });
});
