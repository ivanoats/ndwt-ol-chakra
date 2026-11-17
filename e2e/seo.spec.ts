import { expect, test } from '@playwright/test';

// Phase 14 cutover: crawler-facing output. The origin in these URLs
// comes from SITE_URL / Netlify's URL at build time, so assertions
// match paths, not hosts.

test.describe('SEO + cutover output (Phase 14)', () => {
  test('robots.txt allows crawling and points at the sitemap', async ({
    request,
  }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain('Allow: /');
    expect(body).toMatch(/Sitemap: https?:\/\/[^/]+\/sitemap\.xml/u);
  });

  test('sitemap lists editorial and per-site routes', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toMatch(/<loc>[^<]*\/water-safety\/weather\/<\/loc>/u);
    expect(body).toMatch(/<loc>[^<]*\/sites\/blalock-canyon\/<\/loc>/u);
  });

  for (const path of ['/', '/sites/blalock-canyon/', '/water-safety/']) {
    test(`${path} has canonical + share-card tags`, async ({ page }) => {
      await page.goto(path);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute(
        'href',
        new RegExp(`${path.replaceAll('/', '\\/')}$`, 'u')
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
      await expect(
        page.locator('meta[property="og:site_name"]')
      ).toHaveAttribute('content', 'Northwest Discovery Water Trail');
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
    });
  }
});
