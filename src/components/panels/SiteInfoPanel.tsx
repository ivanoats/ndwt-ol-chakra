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

const Detail = ({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}): JSX.Element | null => {
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

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={close}
      size={{ base: 'full', md: 'md' }}
    >
      <DrawerOverlay />
      <DrawerContent data-testid="site-info-panel">
        <DrawerCloseButton />
        {selectedSite !== null && (
          <>
            <DrawerHeader borderBottomWidth="1px">
              <Heading size="md">{formatTitle(selectedSite)}</Heading>
              <Text fontSize="sm" color="gray.500" mt={1}>
                {selectedSite.riverSegment}
                {selectedSite.bank !== '' ? ` · ${selectedSite.bank}` : null}
              </Text>
            </DrawerHeader>
            <DrawerBody>
              <Stack spacing={4} mt={2}>
                <FacilityBadges facilities={selectedSite.facilities} />
                <Detail label="Season" value={selectedSite.season} />
                <Detail label="Camping" value={selectedSite.camping} />
                <Detail label="Contact" value={selectedSite.contact} />
                <Detail label="Phone" value={selectedSite.phone} />
                {selectedSite.website !== undefined &&
                selectedSite.website !== '' ? (
                  <Box>
                    <Text
                      fontSize="sm"
                      color="gray.500"
                      textTransform="uppercase"
                    >
                      Website
                    </Text>
                    <Link
                      href={selectedSite.website}
                      isExternal
                      color="green.600"
                    >
                      {selectedSite.website}
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
