import { expect, test } from '@playwright/test';

test.describe('Site navigation', () => {
  test('home page shows the hero, header, and footer', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /367-mile/ })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Primary' })
    ).toBeVisible();
    await expect(
      page.getByRole('contentinfo').getByText(/managed by/i)
    ).toBeVisible();
  });

  test('clicking About navigates to /about and renders the page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about\/?$/);
    await expect(
      page.getByRole('heading', { name: 'About the Water Trail' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  test('clicking Trip Planning navigates to /trip-planning', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Trip Planning' }).click();
    await expect(page).toHaveURL(/\/trip-planning\/?$/);
    await expect(
      page.getByRole('heading', { name: 'Trip Planning' })
    ).toBeVisible();
  });

  test('Map link returns to the home page', async ({ page }) => {
    await page.goto('/about/');
    await page.getByRole('link', { name: 'Map' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /367-mile/ })).toBeVisible();
  });
});
