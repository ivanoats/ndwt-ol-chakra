import { describe, expect, it } from 'vitest';

import { coordinates, FacilitySet, type Site, siteId } from '../../../domain';
import { gpxFilename, siteToGpx } from '../site-to-gpx';

const baseSite: Site = {
  id: siteId('x'),
  riverSegment: 'Lake Umatilla',
  riverName: 'Columbia',
  riverMile: 234,
  bank: 'OR',
  coordinates: coordinates(-120.37, 45.695),
  season: 'year round',
  contact: 'US Army Corps of Engineers',
  facilities: FacilitySet.fromFlags({ boatRamp: true, restrooms: true }),
};

describe('siteToGpx', () => {
  it('emits a GPX 1.1 document with one wpt at the site coordinates', () => {
    const gpx = siteToGpx(baseSite);
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(gpx).toContain('lat="45.695"');
    expect(gpx).toContain('lon="-120.37"');
  });

  it('uses the river-and-mile string as the waypoint name', () => {
    expect(siteToGpx(baseSite)).toContain(
      '<name>Columbia River — Mile 234</name>'
    );
  });

  it('packs segment, bank, season, contact, and facilities into desc', () => {
    const gpx = siteToGpx(baseSite);
    expect(gpx).toContain('Lake Umatilla');
    expect(gpx).toContain('Bank: OR');
    expect(gpx).toContain('Season: year round');
    expect(gpx).toContain('Contact: US Army Corps of Engineers');
    expect(gpx).toContain('Facilities: Restrooms, Boat ramp');
  });

  it('escapes XML special characters in name and description', () => {
    const gpx = siteToGpx({
      ...baseSite,
      riverName: 'Snake & Co',
      contact: 'Fish <Wildlife>',
    });
    expect(gpx).toContain('Snake &amp; Co River');
    expect(gpx).toContain('Contact: Fish &lt;Wildlife&gt;');
  });

  it('omits empty optional fields from desc', () => {
    const gpx = siteToGpx({
      ...baseSite,
      season: undefined,
      contact: '',
      bank: '',
      facilities: FacilitySet.empty(),
    });
    expect(gpx).not.toContain('Season:');
    expect(gpx).not.toContain('Contact:');
    expect(gpx).not.toContain('Bank:');
    expect(gpx).not.toContain('Facilities:');
  });
});

describe('gpxFilename', () => {
  it('builds a slugified filename from river + mile', () => {
    expect(gpxFilename(baseSite)).toBe('columbia-mile-234.gpx');
  });

  it('falls back to "waypoint" when riverName has no slug-friendly chars', () => {
    expect(gpxFilename({ ...baseSite, riverName: '???', riverMile: 0 })).toBe(
      'waypoint-mile-0.gpx'
    );
  });
});
