import { expect, type Page, test } from '@playwright/test';

test.describe('Northwest Discovery Water Trail map', () => {
  test('renders the OpenLayers canvas at non-zero size', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByText('Northwest Discovery Water Trail')
    ).toBeVisible();

    const mapContainer = page.locator('#map');
    await expect(mapContainer).toBeVisible();

    const canvas = mapContainer.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (box === null) throw new Error('OL canvas should have a bounding box');
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('serves the GeoJSON dataset as a static asset', async ({ request }) => {
    // Phase 4 inlines the parsed sites into the page tree at build
    // time, so the map no longer fetches /data/ndwt.geojson at
    // runtime — but the file is still served (kept under public/)
    // for external GIS consumers.
    const response = await request.get('/data/ndwt.geojson');
    expect(response.status()).toBe(200);

    const raw: unknown = await response.json();
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`expected a JSON object, got ${typeof raw}`);
    }
    const body = raw as { type?: unknown; features?: unknown };
    expect(body.type).toBe('FeatureCollection');
    expect(Array.isArray(body.features)).toBe(true);
    const features = body.features as readonly unknown[];
    expect(features.length).toBeGreaterThan(100);
  });

  test('clicking a marker opens the info panel with site data', async ({
    page,
  }) => {
    await page.goto('/');
    await clickFirstMarker(page);

    const panel = page.getByTestId('site-info-panel');
    await expect(panel).toBeVisible();
    // Every site has a non-empty canonical name in the header (post
    // Phase 8 enrichment).
    const heading = panel.getByRole('heading').first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toBeEmpty();
    // Subheading carries the river-and-mile context.
    await expect(panel.getByText(/Mile \d/)).toBeVisible();
    // Coordinates row + GPX download button are part of the panel.
    await expect(panel.getByText(/Coordinates/i)).toBeVisible();
    await expect(panel.getByTestId('download-gpx-button')).toBeVisible();
  });

  test('hovering over a marker switches the cursor to pointer', async ({
    page,
  }) => {
    await page.goto('/');
    await recenterOnFirstMarker(page);

    const mapBox = await page.locator('#map').boundingBox();
    if (mapBox === null) throw new Error('#map should have a bounding box');

    // Empty viewport hover -> default cursor.
    await page.mouse.move(mapBox.x + 5, mapBox.y + 5);
    const cursorOff = await page
      .locator('#map')
      .evaluate((el) => (el as HTMLElement).style.cursor);
    expect(cursorOff).not.toBe('pointer');

    // Centered on a marker -> cursor goes to pointer.
    await page.mouse.move(
      mapBox.x + mapBox.width / 2,
      mapBox.y + mapBox.height / 2
    );
    await expect
      .poll(() =>
        page.locator('#map').evaluate((el) => (el as HTMLElement).style.cursor)
      )
      .toBe('pointer');
  });

  test('closing the panel hides it again', async ({ page }) => {
    await page.goto('/');
    await clickFirstMarker(page);

    const panel = page.getByTestId('site-info-panel');
    await expect(panel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('USGS Aerial Imagery tile URL serves real imagery for the NDWT extent', async ({
    request,
  }) => {
    // Direct contract check on the upstream tile service: a known
    // z=12 tile over the Tri-Cities reach of the Columbia should
    // return a substantive JPEG (~10–20 KB on USGS National Map).
    // Catches the regression class where a typo / dead URL silently
    // returns a 404 page or an empty placeholder.
    //
    // Tolerance: distinguish contract violations (4xx, wrong
    // content-type, empty body — real bugs) from transient upstream
    // outages (5xx, network errors — not our code). Soft-skip the
    // latter so a USGS outage doesn't block deploys.
    const url =
      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/12/1430/655';
    let resp: Awaited<ReturnType<typeof request.get>> | undefined;
    let skipReason: string | undefined;
    try {
      resp = await request.get(url, { timeout: 10_000 });
      if (resp.status() >= 500) {
        skipReason = `USGS National Map returned ${resp.status()} — transient upstream outage`;
      }
    } catch (err) {
      skipReason = `USGS National Map unreachable: ${err instanceof Error ? err.message : String(err)}`;
    }
    test.skip(skipReason !== undefined, skipReason ?? '');
    if (resp === undefined) return; // unreachable post-skip; satisfies TS narrowing
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toMatch(/^image\//);
    const body = await resp.body();
    expect(body.length).toBeGreaterThan(5000);
  });

  test('switching to Aerial Imagery fetches real tiles and keeps canvas live', async ({
    page,
    request,
  }) => {
    // Probe upstream availability once before driving the UI. If
    // USGS National Map is unreachable or returning 5xx, soft-skip
    // — that's an upstream outage, not an app regression. The full
    // contract assertions still run when the service is healthy.
    let skipReason: string | undefined;
    try {
      const probe = await request.get(
        'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/8/87/41',
        { timeout: 10_000 }
      );
      if (probe.status() >= 500) {
        skipReason = `USGS upstream returned ${probe.status()} on probe — transient outage`;
      }
    } catch (err) {
      skipReason = `USGS upstream unreachable on probe: ${err instanceof Error ? err.message : String(err)}`;
    }
    test.skip(skipReason !== undefined, skipReason ?? '');

    // Capture every response from the USGSImageryOnly tile prefix so
    // we can assert at least one returned real bytes (>1.5 KB) — a
    // size floor that rules out 404 HTML error pages and any empty
    // placeholder PNG. Use the actual body length (not the
    // Content-Length header) so chunked-transfer or
    // Content-Length-stripping proxies can't cause false negatives.
    const TILE_PREFIX =
      'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile';
    const tileResponses: Array<{ status: number; size: number }> = [];
    page.on('response', async (resp) => {
      if (resp.url().startsWith(TILE_PREFIX)) {
        try {
          const body = await resp.body();
          tileResponses.push({ status: resp.status(), size: body.length });
        } catch {
          // Aborted / non-bufferable responses — skip silently.
        }
      }
    });

    await page.goto('/');
    // Wait for OL to be wired up — the map is dynamic-imported with
    // ssr:false so the canvas may not be ready on first paint.
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    await page.getByRole('button', { name: 'Toggle layer switcher' }).click();
    const aerialButton = page.getByRole('button', { name: /Aerial Imagery/ });
    await aerialButton.click();

    await expect(aerialButton).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: /Street Map/ })
    ).toHaveAttribute('aria-pressed', 'false');

    // Canvas still renders after the basemap swap.
    const canvas = page.locator('#map').locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (box === null) throw new Error('OL canvas should have a bounding box');
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);

    // Regression: at least one imagery tile request must return 200
    // with substantive bytes.
    await expect
      .poll(
        () =>
          tileResponses.filter((r) => r.status === 200 && r.size > 1500).length,
        { timeout: 15_000 }
      )
      .toBeGreaterThan(0);
  });

  test('shows the basemap-unavailable banner when active layer tiles fail', async ({
    page,
  }) => {
    // Force every OSM tile request to 503 — simulates an upstream
    // outage of the user's active basemap. The banner should show
    // up within a few seconds once OL's source has fired enough
    // tileloaderror events to cross the "down" threshold.
    await page.route(/tile\.openstreetmap\.org\//, (route) =>
      route.fulfill({ status: 503, body: 'simulated outage' })
    );

    await page.goto('/');
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    // OSM is the default basemap → its failure triggers the banner.
    const banner = page.getByTestId('tile-health-banner');
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(banner).toContainText(/Basemap unavailable/i);
    await expect(banner).toContainText(/Street Map/);
  });

  test('hides the banner once a healthy basemap is selected', async ({
    page,
  }) => {
    await page.route(/tile\.openstreetmap\.org\//, (route) =>
      route.fulfill({ status: 503, body: 'simulated outage' })
    );

    await page.goto('/');
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    const banner = page.getByTestId('tile-health-banner');
    await expect(banner).toBeVisible({ timeout: 20_000 });

    // Switch to USGS Topo (different host, no route override). The
    // banner reads health for the new active layer, which has no
    // events yet → 'unknown' → banner hides. Scope the click to the
    // LayerSwitcher panel — the Tier 2 banner now also renders a
    // "Switch to USGS Topo" fallback button which would otherwise
    // collide on the role/name selector.
    await page.getByRole('button', { name: 'Toggle layer switcher' }).click();
    await page
      .getByRole('group', { name: 'Map layers' })
      .getByRole('button', { name: /USGS Topo/ })
      .click();

    await expect(banner).toBeHidden({ timeout: 5_000 });
  });

  test('one-click fallback switches to a healthy basemap and clears the banner', async ({
    page,
  }) => {
    // OSM is the failing default; force every OSM tile to 503 so
    // the banner reaches the 'down' state. USGS, OpenTopoMap, and
    // USGS Imagery are untouched so suggestFallback has healthy
    // candidates to surface in the switch button.
    await page.route(/tile\.openstreetmap\.org\//, (route) =>
      route.fulfill({ status: 503, body: 'simulated outage' })
    );

    await page.goto('/');
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    const banner = page.getByTestId('tile-health-banner');
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(banner).toHaveAttribute('data-status', 'down');

    // The fallback button should appear inside the banner once the
    // layer is fully down. Its label names whichever basemap
    // suggestFallback picked — verify the click handler switches to
    // that layer.
    const fallbackButton = page.getByTestId('tile-health-fallback-button');
    await expect(fallbackButton).toBeVisible({ timeout: 5_000 });
    await expect(fallbackButton).toContainText(/Switch to/);

    await fallbackButton.click();

    // Banner clears because the new active basemap has no recorded
    // events yet (or is healthy).
    await expect(banner).toBeHidden({ timeout: 5_000 });

    // And the active basemap actually changed away from OSM.
    await page.getByRole('button', { name: 'Toggle layer switcher' }).click();
    await expect(
      page.getByRole('button', { name: /Street Map/ })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('LayerSwitcher health dot turns red when the active basemap is down', async ({
    page,
  }) => {
    await page.route(/tile\.openstreetmap\.org\//, (route) =>
      route.fulfill({ status: 503, body: 'simulated outage' })
    );

    await page.goto('/');
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    // Wait for the banner so we know OSM has reached 'down'.
    await expect(page.getByTestId('tile-health-banner')).toBeVisible({
      timeout: 20_000,
    });

    // Open the switcher and assert the dot for OSM is red.
    await page.getByRole('button', { name: 'Toggle layer switcher' }).click();
    await expect(page.getByTestId('health-dot-osm')).toHaveAttribute(
      'data-status',
      'down'
    );
  });
});

async function clickFirstMarker(page: Page): Promise<void> {
  await recenterOnFirstMarker(page);
  const mapBox = await page.locator('#map').boundingBox();
  if (mapBox === null) throw new Error('#map should have a bounding box');
  await page.mouse.click(
    mapBox.x + mapBox.width / 2,
    mapBox.y + mapBox.height / 2
  );
}

/**
 * Wait for the test-only window.__ndwtMap to appear (Next
 * dynamic-imports the OL component after page hydration), then
 * recenter on the first vector feature, zoom in, and resolve when
 * OL fires `rendercomplete`. This avoids cross-platform
 * mouse-coordinate flakiness and any hit-tolerance ambiguity at low
 * zoom levels — clicks then go through the real OL event pipeline
 * at the canvas center.
 */
async function recenterOnFirstMarker(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
    undefined,
    { timeout: 15_000 }
  );

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const map = (globalThis as unknown as { __ndwtMap?: unknown })
          .__ndwtMap as {
          once: (event: string, cb: () => void) => void;
          getLayers: () => { getArray: () => unknown[] };
          getView: () => {
            setCenter: (c: number[]) => void;
            setZoom: (z: number) => void;
          };
        };

        const tryRecenter = (): boolean => {
          const layers = map.getLayers().getArray() as Array<{
            getSource?: () =>
              | {
                  getFeatures?: () => Array<{
                    getGeometry: () => { getCoordinates: () => number[] };
                  }>;
                }
              | undefined;
          }>;
          for (const layer of layers) {
            const features = layer.getSource?.()?.getFeatures?.();
            const first =
              features && features.length > 0 ? features[0] : undefined;
            if (first === undefined) continue;
            map.once('rendercomplete', () => resolve());
            map.getView().setCenter(first.getGeometry().getCoordinates());
            map.getView().setZoom(15);
            return true;
          }
          return false;
        };

        if (tryRecenter()) return;

        // Vector layer not added yet — poll until it is.
        const interval = globalThis.setInterval(() => {
          if (tryRecenter()) globalThis.clearInterval(interval);
        }, 100);
        globalThis.setTimeout(() => {
          globalThis.clearInterval(interval);
          reject(new Error('vector layer never appeared'));
        }, 10_000);
      })
  );
}
