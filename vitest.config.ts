import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Next's `server-only` package is a build-time guard with no
      // runtime export. Vitest doesn't ship Next's resolver, so
      // alias it to an empty stub for the unit suite.
      'server-only': new URL(
        './src/__tests__/server-only-stub.ts',
        import.meta.url
      ).pathname,
      // PandaCSS generates the styled-system folder at the repo
      // root; Vitest's bundler can't follow tsconfig paths, so alias
      // the bare specifier here too.
      'styled-system': new URL('./styled-system', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build', 'out', 'e2e', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
});
