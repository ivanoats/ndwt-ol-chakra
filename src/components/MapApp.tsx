'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { Box, Flex, Text } from '@chakra-ui/react';

import { createComposition } from '../composition-root';
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
  // Build the composition synchronously from props — no global
  // mutation, no concurrent-render races. Re-runs only if the sites
  // array identity changes (it shouldn't in production; HMR-friendly).
  const composition = useMemo(() => createComposition(sites), [sites]);

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
        <MapComponent sites={sites} getSite={composition.getSite} />
      </Flex>
      <SiteInfoPanel />
      <ThemeToggleButton pos="fixed" bottom="2" right="2" />
    </Box>
  );
}
