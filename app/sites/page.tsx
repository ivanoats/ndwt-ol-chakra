import type { Metadata } from 'next';
import { css } from 'styled-system/css';

import { loadSites } from '@/adapters/inbound/next/load-sites';
import SiteIndex from '@/components/sites/SiteIndex';

export const metadata: Metadata = {
  title: 'Sites — Northwest Discovery Water Trail',
  description:
    'Browse every launch site, campground, and day-use area on the ' +
    '367-mile Northwest Discovery Water Trail. Filter by name, river, ' +
    'or facilities.',
};

const pageStyle = css({
  maxWidth: '5xl',
  marginX: 'auto',
  paddingX: { base: '4', md: '6' },
  paddingY: { base: '6', md: '10' },
  color: 'fg.default',
});

export default async function SitesIndexPage() {
  const sites = await loadSites();
  return (
    <main className={pageStyle}>
      <SiteIndex sites={sites} />
    </main>
  );
}
