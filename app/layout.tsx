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
          color: 'fg.default',
          backgroundColor: 'bg.default',
        })}
      >
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
