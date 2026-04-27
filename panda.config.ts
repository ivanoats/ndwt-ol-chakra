import { defineConfig } from '@pandacss/dev';
import { createPreset } from '@park-ui/panda-preset';
import green from '@park-ui/panda-preset/colors/green';
import sage from '@park-ui/panda-preset/colors/sage';

export default defineConfig({
  preflight: true,
  presets: [
    '@pandacss/preset-base',
    createPreset({ accentColor: green, grayColor: sage, radius: 'md' }),
  ],
  include: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  exclude: [],
  jsxFramework: 'react',
  outdir: 'styled-system',
  importMap: 'styled-system',
});
