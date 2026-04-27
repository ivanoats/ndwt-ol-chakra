import { useEffect, useState } from 'react';

import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react';

import { gpxFilename, siteToGpx } from '../../adapters/outbound/site-to-gpx';
import type { Site } from '../../domain';
import { useSelectedSite } from '../../store/selected-site';

import FacilityBadges from './FacilityBadges';

const formatTitle = (site: Site): string =>
  `${site.riverName} River — Mile ${site.riverMile}`;

const formatSubheading = (site: Site): string =>
  [site.riverSegment, site.bank]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ');

const formatCoordinates = ({
  latitude,
  longitude,
}: Site['coordinates']): string =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

interface DetailProps {
  readonly label: string;
  readonly value: string | undefined;
}

const Detail = ({ label, value }: DetailProps): JSX.Element | null => {
  if (value === undefined || value === '') return null;
  return (
    <Box>
      <Text fontSize="sm" color="gray.500" textTransform="uppercase">
        {label}
      </Text>
      <Text>{value}</Text>
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

export default function SiteInfoPanel(): JSX.Element {
  const selectedSite = useSelectedSite((state) => state.selectedSite);
  const close = useSelectedSite((state) => state.close);
  const isOpen = selectedSite !== null;

  // Buffer the site so the drawer keeps rendering its content during
  // the close animation; we clear `displaySite` only after the
  // transition finishes via onCloseComplete.
  const [displaySite, setDisplaySite] = useState<Site | null>(selectedSite);
  useEffect(() => {
    if (selectedSite !== null) setDisplaySite(selectedSite);
  }, [selectedSite]);

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={close}
      onCloseComplete={() => setDisplaySite(null)}
      size={{ base: 'full', md: 'md' }}
    >
      <DrawerOverlay />
      <DrawerContent data-testid="site-info-panel">
        <DrawerCloseButton />
        {displaySite === null ? null : (
          <>
            <DrawerHeader borderBottomWidth="1px">
              <Heading size="md">{formatTitle(displaySite)}</Heading>
              <Text fontSize="sm" color="gray.500" mt={1}>
                {formatSubheading(displaySite)}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              <Stack spacing={4} mt={2}>
                <FacilityBadges facilities={displaySite.facilities} />
                <Detail
                  label="Coordinates"
                  value={formatCoordinates(displaySite.coordinates)}
                />
                <Detail label="Season" value={displaySite.season} />
                <Detail label="Camping" value={displaySite.camping} />
                <Detail label="Contact" value={displaySite.contact} />
                <Detail label="Phone" value={displaySite.phone} />
                {displaySite.website !== undefined &&
                displaySite.website !== '' ? (
                  <Box>
                    <Text
                      fontSize="sm"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Website
                    </Text>
                    <Link
                      href={displaySite.website}
                      isExternal
                      color="green.600"
                    >
                      {displaySite.website}
                    </Link>
                  </Box>
                ) : null}
                <Box pt={2}>
                  <Button
                    colorScheme="green"
                    size="sm"
                    onClick={() => downloadGpx(displaySite)}
                    data-testid="download-gpx-button"
                  >
                    Download GPX waypoint
                  </Button>
                </Box>
              </Stack>
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
