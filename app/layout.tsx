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
    <html lang="en" suppressHydrationWarning>
      <body
        className={css({
          minHeight: '100vh',
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
              minHeight: 0,
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
