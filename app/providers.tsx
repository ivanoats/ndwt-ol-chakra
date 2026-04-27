'use client';

import type { ReactNode } from 'react';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';

import theme from '../src/theme';

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </>
  );
}
