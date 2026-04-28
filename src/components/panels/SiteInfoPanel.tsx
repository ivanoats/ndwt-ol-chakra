'use client';

import { css } from 'styled-system/css';

import { gpxFilename, siteToGpx } from '../../adapters/outbound/site-to-gpx';
import type { Site } from '../../domain';
import { useSelectedSite } from '../../store/selected-site';
import { Box } from '../ui/box';
import { Button } from '../ui/button';
import { Drawer, DrawerBody, DrawerHeader } from '../ui/drawer';
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

interface DetailProps {
  readonly label: string;
  readonly value: string | undefined;
}

const labelStyle = css({
  fontSize: 'sm',
  color: 'fg.muted',
  textTransform: 'uppercase',
  letterSpacing: 'wider',
  margin: 0,
});

const valueStyle = css({ margin: 0, color: 'fg.default' });

const Detail = ({ label, value }: DetailProps) => {
  if (value === undefined || value === '') return null;
  return (
    <Box>
      <p className={labelStyle}>{label}</p>
      <p className={valueStyle}>{value}</p>
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

interface PanelBodyProps {
  readonly site: Site;
}

const DownloadGpxButton = ({ site }: PanelBodyProps) => (
  <Box css={{ paddingTop: '2' }}>
    <Button
      size="sm"
      onClick={() => downloadGpx(site)}
      data-testid="download-gpx-button"
    >
      Download GPX waypoint
    </Button>
  </Box>
);

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

const formatLocation = (site: Site): string | undefined => {
  const parts = [site.county, site.state].filter(
    (part): part is string => part !== undefined && part !== ''
  );
  return parts.length === 0 ? undefined : parts.join(', ');
};

const PanelBody = ({ site }: PanelBodyProps) => (
  <>
    <DrawerHeader>
      <Heading size="md">{site.name}</Heading>
      <Text as="p" css={{ fontSize: 'sm', color: 'fg.muted', marginTop: '1' }}>
        {formatSubheading(site)}
      </Text>
    </DrawerHeader>
    <DrawerBody>
      <Stack gap="4" css={{ marginTop: '2' }}>
        <FacilityBadges facilities={site.facilities} />
        <Detail label="Location" value={formatLocation(site)} />
        <Detail
          label="Coordinates"
          value={formatCoordinates(site.coordinates)}
        />
        <Detail label="Season" value={site.season} />
        <Detail label="Camping" value={site.camping} />
        <Detail label="Camping fee" value={site.campingFee} />
        <Detail label="Contact" value={site.contact} />
        <Detail label="Phone" value={site.phone} />
        <WebsiteRow url={site.website} />
        <Detail label="Notes" value={site.notes} />
        <DownloadGpxButton site={site} />
      </Stack>
    </DrawerBody>
  </>
);

export default function SiteInfoPanel() {
  const selectedSite = useSelectedSite((state) => state.selectedSite);
  const close = useSelectedSite((state) => state.close);

  // Ark UI Dialog keeps the panel mounted with data-state="closed"
  // when not open (vs Chakra v2 which unmounted), so we don't need
  // a buffered displaySite for the close animation — content just
  // disappears with the dialog itself.
  return (
    <Drawer open={selectedSite !== null} onClose={close}>
      {selectedSite === null ? null : <PanelBody site={selectedSite} />}
    </Drawer>
  );
}
