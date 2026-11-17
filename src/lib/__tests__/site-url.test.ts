import { describe, expect, it } from 'vitest';

import { absoluteUrl, resolveSiteUrl } from '../site-url';

describe('resolveSiteUrl', () => {
  it('prefers SITE_URL over Netlify URL', () => {
    expect(
      resolveSiteUrl({
        SITE_URL: 'https://ndwt.org',
        URL: 'https://ndwt-ol-chakra.netlify.app',
      })
    ).toBe('https://ndwt.org');
  });

  it('falls back to Netlify URL', () => {
    expect(resolveSiteUrl({ URL: 'https://ndwt-ol-chakra.netlify.app' })).toBe(
      'https://ndwt-ol-chakra.netlify.app'
    );
  });

  it('ignores blank values and falls back to localhost', () => {
    expect(resolveSiteUrl({ SITE_URL: '  ', URL: '' })).toBe(
      'http://localhost:3000'
    );
  });

  it('normalizes to an origin with no path or trailing slash', () => {
    expect(resolveSiteUrl({ SITE_URL: 'https://ndwt.org/some/path/' })).toBe(
      'https://ndwt.org'
    );
  });

  it('throws on a malformed URL so a bad env var fails the build', () => {
    expect(() => resolveSiteUrl({ SITE_URL: 'not a url' })).toThrow();
  });
});

describe('absoluteUrl', () => {
  it('joins a path onto the base origin', () => {
    expect(absoluteUrl('/sites/', 'https://ndwt.org')).toBe(
      'https://ndwt.org/sites/'
    );
  });
});
