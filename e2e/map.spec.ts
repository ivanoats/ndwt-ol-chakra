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

  test('fetches the GeoJSON dataset and the response holds many features', async ({
    page,
  }) => {
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/data/ndwt.geojson') &&
        res.request().method() === 'GET'
    );

    await page.goto('/');
    const response = await responsePromise;

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
    // Every site renders "<river> River — Mile <n>" into the header.
    await expect(panel.getByRole('heading')).toContainText(/Mile/);
    // Coordinates row + GPX download button are part of the panel.
    await expect(panel.getByText(/Coordinates/i)).toBeVisible();
    await expect(panel.getByTestId('download-gpx-button')).toBeVisible();
  });

  test('closing the panel hides it again', async ({ page }) => {
    await page.goto('/');
    await clickFirstMarker(page);

    const panel = page.getByTestId('site-info-panel');
    await expect(panel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });
});

/**
 * Centers the map on the first vector feature and zooms in so the
 * marker fills a known viewport position, waits for the OL
 * `rendercomplete` event, then clicks the canvas center. This
 * avoids cross-platform mouse-coordinate flakiness and any
 * hit-tolerance ambiguity at low zoom levels. The click goes through
 * the real OL event pipeline (canvas mouseup -> click), so it
 * exercises the production click handler end to end.
 */
async function clickFirstMarker(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const map = (globalThis as unknown as { __ndwtMap?: unknown })
          .__ndwtMap as
          | {
              once: (event: string, cb: () => void) => void;
              getLayers: () => { getArray: () => unknown[] };
              getView: () => {
                setCenter: (c: number[]) => void;
                setZoom: (z: number) => void;
              };
            }
          | undefined;
        if (map === undefined) {
          reject(new Error('window.__ndwtMap is not set'));
          return;
        }

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

  const mapBox = await page.locator('#map').boundingBox();
  if (mapBox === null) throw new Error('#map should have a bounding box');
  await page.mouse.click(
    mapBox.x + mapBox.width / 2,
    mapBox.y + mapBox.height / 2
  );
}
