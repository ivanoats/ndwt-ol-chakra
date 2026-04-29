import { expect, test } from '@playwright/test';

const ROUTES: ReadonlyArray<{
  readonly path: string;
  readonly heading: RegExp;
}> = [
  { path: '/water-safety/', heading: /Water Safety/u },
  { path: '/water-safety/weather/', heading: /^Weather$/u },
  { path: '/water-safety/barge-traffic/', heading: /Barge Traffic/u },
  { path: '/water-safety/communications/', heading: /Communications/u },
  { path: '/water-safety/reading-the-rivers/', heading: /Reading the Rivers/u },
  { path: '/water-safety/float-plans/', heading: /Float Plans/u },
  { path: '/water-safety/safety-gear/', heading: /Safety Gear/u },
  { path: '/river-navigation/', heading: /River Navigation/u },
  { path: '/river-navigation/lock-and-dam/', heading: /Lock & Dam Protocol/u },
  { path: '/river-navigation/portage-guide/', heading: /Portage Guide/u },
  { path: '/leave-no-trace/', heading: /Leave No Trace/u },
];

test.describe('Editorial content (Phase 11)', () => {
  for (const { path, heading } of ROUTES) {
    test(`${path} renders an h1 + WWTA attribution`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1, name: heading })
      ).toBeVisible();

      // Sub-pages have an attribution paragraph at the bottom; the
      // section index pages don't (they reference the source in the
      // intro). Both should mention "Washington Water Trails
      // Association" somewhere in the article body.
      const article = page.locator('article').first();
      await expect(article).toContainText(
        /Washington Water Trails Association/u
      );
    });
  }

  test('Header has Safety / Navigation / Leave No Trace nav links', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Safety' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Navigation' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Leave No Trace' })
    ).toBeVisible();
  });
});
