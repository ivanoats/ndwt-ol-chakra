'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Box, Flex, Text } from '@chakra-ui/react';

import { hydrateSites } from '../composition-root';
import type { Site } from '../domain';

import SiteInfoPanel from './panels/SiteInfoPanel';
import ThemeToggleButton from './ThemeToggleButton';

// OpenLayers touches `window` at import time, so dynamic-import with
// ssr: false; static export still works because Next pre-renders the
// shell and the map mounts on the client.
const MapComponent = dynamic(() => import('./map'), { ssr: false });

const textFontSizes = [14, 18, 24, 30];

interface MapAppProps {
  readonly sites: readonly Site[];
}

export default function MapApp({ sites }: MapAppProps) {
  // Hydrate the composition-root in-memory repository synchronously
  // on first render so the click handler's getSite() lookup works
  // even if a user clicks before useEffect settles.
  useState(() => {
    hydrateSites(sites);
    return true;
  });

  return (
    <Box>
      <Flex
        as="header"
        direction="column"
        alignItems="center"
        justifyContent="center"
        h="100vh"
        fontSize="3xl"
      >
        <Text fontSize={textFontSizes}>Northwest Discovery Water Trail</Text>
        <MapComponent />
      </Flex>
      <SiteInfoPanel />
      <ThemeToggleButton pos="fixed" bottom="2" right="2" />
    </Box>
  );
}
