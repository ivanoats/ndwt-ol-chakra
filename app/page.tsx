import type { Metadata } from 'next';

import { loadSites } from '@/adapters/inbound/next/load-sites';
import Hero from '@/components/layout/Hero';
import MapApp from '@/components/MapApp';
import { pageMetadata, SITE_DESCRIPTION } from '@/lib/page-metadata';

export const metadata: Metadata = pageMetadata({
  description: SITE_DESCRIPTION,
  path: '/',
});

export default async function HomePage() {
  const sites = await loadSites();
  return (
    <>
      <Hero />
      <MapApp sites={sites} />
    </>
  );
}
