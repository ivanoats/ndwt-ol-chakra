import { loadSites } from '@/adapters/inbound/next/load-sites';
import Hero from '@/components/layout/Hero';
import MapApp from '@/components/MapApp';

export default async function HomePage() {
  const sites = await loadSites();
  return (
    <>
      <Hero />
      <MapApp sites={sites} />
    </>
  );
}
