import { expect, test } from '@playwright/test';

const ROUTES: ReadonlyArray<{
  readonly path: string;
  readonly heading: RegExp;
}> = [
  { path: '/about/partners/', heading: /^Partners$/u },
  { path: '/about/history/', heading: /^History$/u },
  { path: '/about/contact/', heading: /^Contact$/u },
  { path: '/about/photo-gallery/', heading: /^Photo Gallery$/u },
  { path: '/get-involved/', heading: /^Get Involved$/u },
];

test.describe('About sub-pages + Get Involved (Phase 13)', () => {
  for (const { path, heading } of ROUTES) {
    test(`${path} renders an h1`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1, name: heading })
      ).toBeVisible();
    });
  }

  test('Contact page surfaces the WWTA mailto', async ({ page }) => {
    await page.goto('/about/contact/');
    await expect(
      page.getByRole('link', { name: 'info@wwta.org' })
    ).toHaveAttribute('href', 'mailto:info@wwta.org');
  });

  test('Get Involved CTAs all point at WWTA', async ({ page }) => {
    await page.goto('/get-involved/');
    const ctas = page.getByRole('link', {
      name: /(Volunteer|Donate|Share a trip report) →/u,
    });
    await expect(ctas).toHaveCount(3);
    for (const cta of await ctas.all()) {
      const href = await cta.getAttribute('href');
      expect(href).toMatch(/wwta\.org/u);
    }
  });

  test('About index page links to all four sub-pages', async ({ page }) => {
    await page.goto('/about/');
    await expect(page.getByRole('link', { name: 'Partners' })).toHaveAttribute(
      'href',
      '/about/partners/'
    );
    await expect(page.getByRole('link', { name: 'History' })).toHaveAttribute(
      'href',
      '/about/history/'
    );
    await expect(
      page.getByRole('link', { name: 'Photo Gallery' })
    ).toHaveAttribute('href', '/about/photo-gallery/');
    await expect(page.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/about/contact/'
    );
  });

  test('Header has Get Involved nav link', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Get Involved' })
    ).toBeVisible();
  });
});
