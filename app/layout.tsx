import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { css } from 'styled-system/css';

import Footer from '../src/components/layout/Footer';
import Header from '../src/components/layout/Header';

import { Providers } from './providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Northwest Discovery Water Trail',
  description:
    'A 367-mile recreational boating route on the Snake, Columbia, and ' +
    'Clearwater rivers — Canoe Camp to Bonneville Dam.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    // suppressHydrationWarning: next-themes injects an inline script
    // in <head> that sets the theme class on <html> before React
    // hydrates (kills FOUC). The server renders <html lang="en">; the
    // post-script HTML is <html lang="en" class="light"|"dark">.
    // React's hydration check would log a mismatch — the divergence
    // is intentional and confined to <html>. This opt-out is one
    // element deep; child elements still get full validation.
    <html lang="en" suppressHydrationWarning>
      <body
        className={css({
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          color: 'fg.default',
          backgroundColor: 'bg.default',
        })}
      >
        <Providers>
          <Header />
          <main
            className={css({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              // Note: no `min-height: 0`. With it, main can shrink
              // below its content's natural size and clip the bottom
              // of /about + /trip-planning. Without it, main grows
              // to fit content (so tall pages scroll) AND still
              // gets `flex: 1`'s share of the body's 100dvh on short
              // pages (so the footer stays at the bottom of the
              // viewport, and the home page's map can flex-grow to
              // fill the gap below the Hero).
            })}
          >
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
