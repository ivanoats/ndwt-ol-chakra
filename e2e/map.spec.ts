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

  test('Nautical Chart tile URL serves real imagery for the Salish Sea', async ({
    request,
  }) => {
    // Direct contract check on the upstream tile service: a known
    // z=8 tile covering Puget Sound should return a substantive
    // image (~30 KB on Esri World Ocean Base). The previous NOAA
    // endpoint we tried returned 0-byte / 1.1 KB placeholder
    // responses — this size floor catches that class of regression.
    const url =
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/8/87/41';
    const resp = await request.get(url);
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toMatch(/^image\//);
    const body = await resp.body();
    expect(body.length).toBeGreaterThan(5000);
  });

  test('switching to Nautical Chart fetches real tiles and keeps canvas live', async ({
    page,
  }) => {
    // Capture every response from the upstream tile prefix so we can
    // assert *real* tile bytes were served (not a 400 or a tiny
    // placeholder PNG, which is how the original NOAA endpoint
    // failed silently).
    const TILE_PREFIX =
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile';
    const tileResponses: Array<{ status: number; size: number }> = [];
    page.on('response', (resp) => {
      if (resp.url().startsWith(TILE_PREFIX)) {
        const lenHeader = resp.headers()['content-length'];
        tileResponses.push({
          status: resp.status(),
          size: lenHeader === undefined ? 0 : parseInt(lenHeader, 10),
        });
      }
    });

    await page.goto('/');
    // Wait for OL to be wired up before driving the switcher — the
    // map is dynamic-imported with ssr:false, so the canvas may not
    // be ready on first paint.
    await page.waitForFunction(
      () =>
        Boolean((globalThis as unknown as { __ndwtMap?: unknown }).__ndwtMap),
      undefined,
      { timeout: 15_000 }
    );

    await page.getByRole('button', { name: 'Toggle layer switcher' }).click();
    const chartButton = page.getByRole('button', { name: /Nautical Chart/ });
    await chartButton.click();

    await expect(chartButton).toHaveAttribute('aria-pressed', 'true');
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

    // Regression: at least one chart tile request must return 200
    // with substantive bytes. >1.5 KB rules out the placeholder PNGs
    // that masked the original blank-basemap bug.
    await expect
      .poll(
        () =>
          tileResponses.filter((r) => r.status === 200 && r.size > 1500).length,
        { timeout: 15_000 }
      )
      .toBeGreaterThan(0);
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
