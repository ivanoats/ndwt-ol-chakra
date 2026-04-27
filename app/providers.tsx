'use client';

import type { ReactNode } from 'react';

import {
  ChakraProvider,
  ColorModeScript,
  extendTheme,
  type ThemeConfig,
} from '@chakra-ui/react';

const themeConfig: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

const theme = extendTheme({ config: themeConfig });

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </>
  );
}
