import type { Facility, Site } from '../../domain';

const FACILITY_LABELS: Record<Facility, string> = {
  restrooms: 'Restrooms',
  potableWater: 'Potable water',
  marineDumpStation: 'Marine dump station',
  dayUseOnly: 'Day use only',
  picnicShelters: 'Picnic shelters',
  boatRamp: 'Boat ramp',
  handCarried: 'Hand-carried launch',
  marina: 'Marina',
  adaAccess: 'ADA access',
};

const escapeXml = (raw: string): string =>
  raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const waypointName = (site: Site): string =>
  `${site.riverName} River — Mile ${site.riverMile}`;

const waypointDescription = (site: Site): string => {
  const parts: string[] = [];
  if (site.riverSegment !== '') parts.push(site.riverSegment);
  if (site.bank !== '') parts.push(`Bank: ${site.bank}`);
  if (site.season !== undefined && site.season !== '')
    parts.push(`Season: ${site.season}`);
  if (site.camping !== undefined && site.camping !== '')
    parts.push(`Camping: ${site.camping}`);
  if (site.contact !== undefined && site.contact !== '')
    parts.push(`Contact: ${site.contact}`);
  if (site.phone !== undefined && site.phone !== '')
    parts.push(`Phone: ${site.phone}`);
  const facilities = site.facilities
    .toArray()
    .map((facility) => FACILITY_LABELS[facility]);
  if (facilities.length > 0) parts.push(`Facilities: ${facilities.join(', ')}`);
  return parts.join('\n');
};

/**
 * Serializes a Site to a single-waypoint GPX 1.1 document. The
 * output is the canonical text a user would expect to import into
 * Garmin BaseCamp, Gaia GPS, OsmAnd, etc.
 */
export const siteToGpx = (site: Site): string => {
  const lat = site.coordinates.latitude;
  const lon = site.coordinates.longitude;
  const name = escapeXml(waypointName(site));
  const desc = escapeXml(waypointDescription(site));

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Northwest Discovery Water Trail" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="${lat}" lon="${lon}">
    <name>${name}</name>
    <desc>${desc}</desc>
  </wpt>
</gpx>
`;
};

export const gpxFilename = (site: Site): string => {
  const slug = site.riverName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  const namePart = slug === '' ? 'waypoint' : slug;
  return `${namePart}-mile-${site.riverMile}.gpx`;
};
