import type { Metadata } from 'next';
import type { ReactNode } from 'react';

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
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
