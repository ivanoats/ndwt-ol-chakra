import { expect, test } from '@playwright/test';

// Pick a stable site that has a real name in the enriched dataset.
// Blalock Canyon (Columbia mile 234) is the canonical example used
// throughout the unit tests, so it's the safest choice for e2e.
const SAMPLE_SLUG = 'blalock-canyon';
const SAMPLE_NAME = 'Blalock Canyon';

test.describe('Per-site canonical URLs (Phase 9)', () => {
  test('GET /sites/<slug> renders the dedicated page with site name', async ({
    page,
  }) => {
    await page.goto(`/sites/${SAMPLE_SLUG}`);

    await expect(
      page.getByRole('heading', { level: 1, name: SAMPLE_NAME })
    ).toBeVisible();

    // Subheading carries the river/mile context.
    await expect(page.getByText(/Columbia River · Mile 234/)).toBeVisible();

    // GPX download is part of the same SiteDetails component that
    // the drawer uses.
    await expect(page.getByTestId('download-gpx-button')).toBeVisible();

    // "View on map" link points back at the home page with the
    // shareable query param.
    const mapLink = page.getByRole('link', { name: /View on map/ });
    await expect(mapLink).toBeVisible();
    await expect(mapLink).toHaveAttribute('href', `/?site=${SAMPLE_SLUG}`);
  });

  test('per-page metadata uses the canonical site name', async ({ page }) => {
    await page.goto(`/sites/${SAMPLE_SLUG}`);
    await expect(page).toHaveTitle(
      /Blalock Canyon — Northwest Discovery Water Trail/
    );
  });

  test('deep-link /?site=<slug> opens the panel with that site selected', async ({
    page,
  }) => {
    await page.goto(`/?site=${SAMPLE_SLUG}`);

    const panel = page.getByTestId('site-info-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading')).toContainText(SAMPLE_NAME);
  });

  test('print media query hides header / footer chrome', async ({ page }) => {
    await page.goto(`/sites/${SAMPLE_SLUG}`);
    await page.emulateMedia({ media: 'print' });

    // header and footer are display:none under @media print.
    const header = page.locator('header').first();
    const footer = page.locator('footer').first();
    await expect(header).toBeHidden();
    await expect(footer).toBeHidden();

    // The article body is still visible.
    await expect(
      page.getByRole('heading', { level: 1, name: SAMPLE_NAME })
    ).toBeVisible();
  });
});
