import { describe, expect, it } from 'vitest';

import { coordinates, FacilitySet, type Site, siteId } from '../../../domain';
import { gpxFilename, siteToGpx } from '../site-to-gpx';

const baseSite: Site = {
  id: siteId('x'),
  name: 'Blalock Canyon',
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

  it('uses the canonical site name as the waypoint name', () => {
    expect(siteToGpx(baseSite)).toContain('<name>Blalock Canyon</name>');
  });

  it('puts the river-and-mile context, segment, bank, season, contact, and facilities in desc', () => {
    const gpx = siteToGpx(baseSite);
    expect(gpx).toContain('Columbia River — Mile 234');
    expect(gpx).toContain('Lake Umatilla');
    expect(gpx).toContain('Bank: OR');
    expect(gpx).toContain('Season: year round');
    expect(gpx).toContain('Contact: US Army Corps of Engineers');
    expect(gpx).toContain('Facilities: Restrooms, Boat ramp');
  });

  it('includes camping fee and notes when present', () => {
    const gpx = siteToGpx({
      ...baseSite,
      campingFee: '$10/night',
      notes: 'Popular salmon fishing.',
    });
    expect(gpx).toContain('Camping fee: $10/night');
    expect(gpx).toContain('Notes: Popular salmon fishing.');
  });

  it('escapes XML special characters in name and description', () => {
    const gpx = siteToGpx({
      ...baseSite,
      name: 'Snake & Co',
      contact: 'Fish <Wildlife>',
    });
    expect(gpx).toContain('<name>Snake &amp; Co</name>');
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
  it('slugifies the canonical site name and appends the river mile', () => {
    expect(gpxFilename(baseSite)).toBe('blalock-canyon-mile-234.gpx');
    expect(gpxFilename({ ...baseSite, name: "Harper's Bend" })).toBe(
      'harper-s-bend-mile-234.gpx'
    );
  });

  it('encodes decimal miles with a dash so the filename stays portable', () => {
    expect(
      gpxFilename({ ...baseSite, name: 'Hood Park', riverMile: 2.5 })
    ).toBe('hood-park-mile-2-5.gpx');
  });

  it('falls back to "waypoint" when name has no slug-friendly chars', () => {
    expect(gpxFilename({ ...baseSite, name: '???', riverMile: 0 })).toBe(
      'waypoint-mile-0.gpx'
    );
  });
});
