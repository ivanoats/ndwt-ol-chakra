import { useEffect, useState } from 'react';

import {
  Box,
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

import type { Site } from '../../domain';
import { useSelectedSite } from '../../store/selected-site';

import FacilityBadges from './FacilityBadges';

const formatTitle = (site: Site): string =>
  `${site.riverName} River — Mile ${site.riverMile}`;

const formatSubheading = (site: Site): string =>
  [site.riverSegment, site.bank]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ');

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
              </Stack>
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
