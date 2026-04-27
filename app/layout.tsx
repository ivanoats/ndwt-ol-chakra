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
    // suppressHydrationWarning is the canonical fix for the
    // next-themes mismatch: the library injects a script that sets
    // the theme class on <html> before React hydrates (kills FOUC),
    // so the server-rendered html and the post-script html always
    // differ. The mismatch is intentional and limited to <html>.
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
