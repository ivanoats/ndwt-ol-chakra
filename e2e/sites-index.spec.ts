import { expect, test } from '@playwright/test';

test.describe('Site index — /sites/ (Phase 10)', () => {
  test('renders an h1 + result count + link list', async ({ page }) => {
    await page.goto('/sites/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Sites' })
    ).toBeVisible();

    const count = page.getByTestId('site-index-count');
    await expect(count).toContainText(/\d+ of \d+ sites/u);

    // Derive the expected row count from the rendered count text
    // rather than hard-coding the dataset size — the test stays
    // green when ndwt-enriched data grows or shrinks.
    const countText = await count.textContent();
    const totalMatch = countText?.match(/\d+ of (\d+) sites/u);
    expect(totalMatch).not.toBeNull();
    const totalSites = Number(totalMatch?.[1] ?? '0');
    expect(totalSites).toBeGreaterThan(100);

    const results = page.getByTestId('site-index-results');
    await expect(results.locator('li')).toHaveCount(totalSites);
  });

  test('typing into the name filter narrows results to a single match', async ({
    page,
  }) => {
    await page.goto('/sites/');

    const query = page.getByTestId('site-index-query');
    await query.fill('blalock');

    const results = page.getByTestId('site-index-results');
    await expect(results.locator('li')).toHaveCount(1);

    const link = page.getByTestId('site-index-row-blalock-canyon');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/sites\/blalock-canyon\/?$/u);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Blalock Canyon' })
    ).toBeVisible();
  });

  test('the river dropdown filters by river name', async ({ page }) => {
    await page.goto('/sites/');
    const before = await page
      .getByTestId('site-index-results')
      .locator('li')
      .count();

    await page
      .getByTestId('site-index-river')
      .selectOption({ label: 'Clearwater' });

    const after = await page
      .getByTestId('site-index-results')
      .locator('li')
      .count();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  test('Header has a "Sites" link going to /sites/', async ({ page }) => {
    await page.goto('/');
    const sitesLink = page.getByRole('link', { name: 'Sites' });
    await expect(sitesLink).toBeVisible();
    await sitesLink.click();
    await expect(page).toHaveURL(/\/sites\/?$/u);
  });
});
