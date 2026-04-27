import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const themeConfig: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

/**
 * Single source of truth for Chakra theme. Imported by
 * `app/providers.tsx`. When Phase 5 swaps Chakra for PandaCSS + Park
 * UI, this file becomes the Panda token preset.
 */
export const theme = extendTheme({ config: themeConfig });

export default theme;
