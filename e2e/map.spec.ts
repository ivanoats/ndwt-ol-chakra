import { expect, test } from '@playwright/test';

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

    const body = (await response.json()) as {
      type: string;
      features: unknown[];
    };
    expect(body.type).toBe('FeatureCollection');
    expect(body.features.length).toBeGreaterThan(100);
    expect(body.features.length).toBeLessThan(300);
  });
});
