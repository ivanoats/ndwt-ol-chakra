import { loadSites } from '@/adapters/inbound/next/load-sites';
import MapApp from '@/components/MapApp';

export default async function HomePage() {
  const sites = await loadSites();
  return <MapApp sites={sites} />;
}
