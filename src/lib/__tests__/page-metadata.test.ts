import { describe, expect, it } from 'vitest';

import { pageMetadata, SITE_NAME } from '../page-metadata';

describe('pageMetadata', () => {
  it('suffixes the page title with the site name', () => {
    const meta = pageMetadata({
      title: 'Weather — Water Safety',
      description: 'Forecasts.',
      path: '/water-safety/weather/',
      type: 'article',
    });
    expect(meta.title).toBe(`Weather — Water Safety — ${SITE_NAME}`);
    expect(meta.alternates?.canonical).toBe('/water-safety/weather/');
    expect(meta.openGraph).toMatchObject({
      title: 'Weather — Water Safety',
      description: 'Forecasts.',
      url: '/water-safety/weather/',
      siteName: SITE_NAME,
      type: 'article',
    });
    expect(meta.twitter).toMatchObject({
      card: 'summary',
      title: 'Weather — Water Safety',
    });
  });

  it('uses the bare site name for the home page', () => {
    const meta = pageMetadata({ description: 'Home.', path: '/' });
    expect(meta.title).toBe(SITE_NAME);
    expect(meta.openGraph).toMatchObject({
      title: SITE_NAME,
      type: 'website',
    });
  });

  it('always includes a share image', () => {
    const meta = pageMetadata({ description: 'x', path: '/about/' });
    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({ url: '/icon-512.png' }),
    ]);
    expect(meta.twitter?.images).toEqual(['/icon-512.png']);
  });
});
