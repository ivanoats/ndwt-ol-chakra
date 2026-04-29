'use client';

import { css } from 'styled-system/css';

import { gpxFilename, siteToGpx } from '../../adapters/outbound/site-to-gpx';
import type { Site } from '../../domain';
import { Box } from '../ui/box';
import { Button } from '../ui/button';
import { Heading } from '../ui/heading';
import { Link } from '../ui/link';
import { Stack } from '../ui/stack';
import { Text } from '../ui/text';

import FacilityBadges from './FacilityBadges';

const formatSubheading = (site: Site): string => {
  const riverPart = `${site.riverName} River · Mile ${site.riverMile}`;
  return [riverPart, site.riverSegment, site.bank]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ');
};

const formatCoordinates = ({
  latitude,
  longitude,
}: Site['coordinates']): string =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const formatLocation = (site: Site): string | undefined => {
  const parts = [site.county, site.state].filter(
    (part): part is string => part !== undefined && part !== ''
  );
  return parts.length === 0 ? undefined : parts.join(', ');
};

const labelStyle = css({
  fontSize: 'sm',
  color: 'fg.muted',
  textTransform: 'uppercase',
  letterSpacing: 'wider',
  margin: 0,
});

const valueStyle = css({ margin: 0, color: 'fg.default' });

interface DetailProps {
  readonly label: string;
  readonly value: string | undefined;
}

const Detail = ({ label, value }: DetailProps) => {
  if (value === undefined || value === '') return null;
  return (
    <Box>
      <p className={labelStyle}>{label}</p>
      <p className={valueStyle}>{value}</p>
    </Box>
  );
};

interface WebsiteRowProps {
  readonly url: string | undefined;
}

const WebsiteRow = ({ url }: WebsiteRowProps) => {
  if (url === undefined || url === '') return null;
  return (
    <Box>
      <p className={labelStyle}>Website</p>
      <Link href={url} external>
        {url}
      </Link>
    </Box>
  );
};

const downloadGpx = (site: Site): void => {
  const blob = new Blob([siteToGpx(site)], {
    type: 'application/gpx+xml',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = gpxFilename(site);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

interface SitePartProps {
  readonly site: Site;
  readonly headingLevel?: 'h1' | 'h2' | 'h3';
  readonly size?: 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * Site name + river/segment/bank subheading. The heading element
 * and visual size are configurable so the dedicated
 * `/sites/<slug>` page can render an `<h1>` at page-title size
 * while the in-map drawer renders an `<h2>` at panel size.
 */
export const SiteHeading = ({
  site,
  headingLevel = 'h2',
  size = 'md',
}: SitePartProps) => (
  <>
    <Heading as={headingLevel} size={size}>
      {site.name}
    </Heading>
    <Text as="p" css={{ fontSize: 'sm', color: 'fg.muted', marginTop: '1' }}>
      {formatSubheading(site)}
    </Text>
  </>
);

/**
 * Facilities, conditional detail rows, and the GPX download
 * button. Layout-neutral — the caller owns the surrounding
 * scrollable area.
 */
export const SiteBody = ({ site }: { readonly site: Site }) => (
  <Stack gap="4" css={{ marginTop: '2' }}>
    <FacilityBadges facilities={site.facilities} />
    <Detail label="Location" value={formatLocation(site)} />
    <Detail label="Coordinates" value={formatCoordinates(site.coordinates)} />
    <Detail label="Season" value={site.season} />
    <Detail label="Camping" value={site.camping} />
    <Detail label="Camping fee" value={site.campingFee} />
    <Detail label="Contact" value={site.contact} />
    <Detail label="Phone" value={site.phone} />
    <WebsiteRow url={site.website} />
    <Detail label="Notes" value={site.notes} />
    <Box css={{ paddingTop: '2' }}>
      <Button
        size="sm"
        onClick={() => downloadGpx(site)}
        data-testid="download-gpx-button"
      >
        Download GPX waypoint
      </Button>
    </Box>
  </Stack>
);
