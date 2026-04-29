import { expect, test } from '@playwright/test';

const ROUTES: ReadonlyArray<{
  readonly path: string;
  readonly heading: RegExp;
}> = [
  { path: '/natural-world/', heading: /Natural World/u },
  { path: '/natural-world/flora-fauna/', heading: /Flora & Fauna/u },
  { path: '/natural-world/geology/', heading: /^Geology$/u },
  { path: '/natural-world/invasive-species/', heading: /Invasive Species/u },
  { path: '/past-and-present/', heading: /Past & Present/u },
  {
    path: '/past-and-present/tribal-communities/',
    heading: /Tribal Communities/u,
  },
  {
    path: '/past-and-present/early-explorers/',
    heading: /Early Western Explorers/u,
  },
  {
    path: '/past-and-present/trade-and-industry/',
    heading: /Trade & Industry/u,
  },
];

test.describe('Cultural / natural content (Phase 12)', () => {
  for (const { path, heading } of ROUTES) {
    test(`${path} renders an h1 + WWTA attribution`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1, name: heading })
      ).toBeVisible();
      const article = page.locator('article').first();
      await expect(article).toContainText(
        /Washington Water Trails Association/u
      );
    });
  }

  test('Tribal Communities page surfaces the WWTA-review notice', async ({
    page,
  }) => {
    await page.goto('/past-and-present/tribal-communities/');
    await expect(page.getByText(/Pending WWTA review/u).first()).toBeVisible();
  });

  test('Header has Natural World + Past & Present nav links', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Natural World' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Past & Present' })
    ).toBeVisible();
  });
});
