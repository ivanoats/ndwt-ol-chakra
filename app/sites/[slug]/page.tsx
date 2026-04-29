import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { css } from 'styled-system/css';

import { loadSites } from '@/adapters/inbound/next/load-sites';
import { SiteBody, SiteHeading } from '@/components/panels/SiteDetails';
import { Link } from '@/components/ui/link';

interface RouteParams {
  readonly slug: string;
}

interface PageProps {
  readonly params: Promise<RouteParams>;
}

export async function generateStaticParams(): Promise<RouteParams[]> {
  const sites = await loadSites();
  return sites.map((site) => ({ slug: site.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sites = await loadSites();
  const site = sites.find((s) => s.slug === slug);
  if (site === undefined) return {};
  const desc =
    `${site.riverName} River, mile ${site.riverMile}` +
    (site.riverSegment !== '' ? ` — ${site.riverSegment}` : '');
  return {
    title: `${site.name} — Northwest Discovery Water Trail`,
    description: desc,
    openGraph: {
      title: site.name,
      description: desc,
      type: 'article',
    },
  };
}

const pageStyle = css({
  maxWidth: '3xl',
  marginX: 'auto',
  paddingX: { base: '4', md: '6' },
  paddingY: { base: '6', md: '10' },
  color: 'fg.default',
  // Print: drop layout chrome via globals.css (the Header / Footer
  // hide themselves under @media print). The page itself just needs
  // a clean width and no shadows/colors that waste ink.
  '@media print': {
    maxWidth: 'none',
    paddingY: '0',
  },
});

const breadcrumbStyle = css({
  fontSize: 'sm',
  color: 'fg.muted',
  marginBottom: '4',
  '@media print': { display: 'none' },
});

const mapLinkStyle = css({
  display: 'inline-block',
  marginTop: '6',
  '@media print': { display: 'none' },
});

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params;
  const sites = await loadSites();
  const site = sites.find((s) => s.slug === slug);
  if (site === undefined) notFound();

  return (
    <article className={pageStyle}>
      <p className={breadcrumbStyle}>
        <Link href="/">Map</Link> / Sites / {site.name}
      </p>
      <SiteHeading site={site} headingLevel="h1" size="2xl" />
      <SiteBody site={site} />
      <p className={mapLinkStyle}>
        <Link href={`/?site=${site.slug}`}>← View on map</Link>
      </p>
    </article>
  );
}
