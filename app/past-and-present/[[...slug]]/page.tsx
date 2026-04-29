import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ComponentType } from 'react';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import SectionIndex from '@/components/editorial/SectionIndex';

import EarlyExplorers from '../../../content/past-and-present/early-explorers.mdx';
import TradeAndIndustry from '../../../content/past-and-present/trade-and-industry.mdx';
import TribalCommunities from '../../../content/past-and-present/tribal-communities.mdx';

interface PageEntry {
  readonly title: string;
  readonly summary: string;
  readonly Component: ComponentType;
}

const PAGES: Readonly<Record<string, PageEntry>> = {
  'tribal-communities': {
    title: 'Tribal Communities',
    summary:
      'Indigenous heritage along the corridor, visiting protocols, ' +
      'tribal sovereignty, and the Columbia River Inter-Tribal Fish ' +
      'Commission. Pending WWTA review.',
    Component: TribalCommunities,
  },
  'early-explorers': {
    title: 'Early Western Explorers',
    summary:
      'Robert Gray, Lewis & Clark, David Thompson, and the early ' +
      'non-Native expeditions that documented the corridor between ' +
      '1792 and 1811.',
    Component: EarlyExplorers,
  },
  'trade-and-industry': {
    title: 'Trade & Industry',
    summary:
      'Indigenous trade networks, Celilo Falls, sternwheelers and ' +
      'railroads, and the federal locks-and-dams that shape the ' +
      'modern corridor.',
    Component: TradeAndIndustry,
  },
};

interface RouteParams {
  readonly slug?: readonly string[];
}

interface PageProps {
  readonly params: Promise<RouteParams>;
}

export function generateStaticParams(): readonly RouteParams[] {
  return [
    { slug: [] },
    ...Object.keys(PAGES).map((slug) => ({ slug: [slug] })),
  ];
}

const SECTION_TITLE = 'Past & Present';
const SECTION_DESC =
  'Cultural and historical context for the Northwest Discovery Water ' +
  'Trail — the tribal nations, expeditions, and industries whose ' +
  'stories are bound up with the Clearwater, Snake, and Columbia.';

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sub = slug?.[0];
  if (sub === undefined) {
    return {
      title: `${SECTION_TITLE} — Northwest Discovery Water Trail`,
      description: SECTION_DESC,
    };
  }
  const entry = PAGES[sub];
  if (entry === undefined) return {};
  return {
    title: `${entry.title} — ${SECTION_TITLE} — Northwest Discovery Water Trail`,
    description: entry.summary,
  };
}

export default async function PastAndPresentPage({ params }: PageProps) {
  const { slug } = await params;
  const sub = slug?.[0];

  if (sub === undefined) {
    return (
      <ArticleLayout
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: SECTION_TITLE }]}
      >
        <SectionIndex
          heading={SECTION_TITLE}
          intro={SECTION_DESC}
          basePath="/past-and-present/"
          pages={Object.entries(PAGES).map(([slug, entry]) => ({
            slug,
            title: entry.title,
            summary: entry.summary,
          }))}
        />
      </ArticleLayout>
    );
  }

  const entry = PAGES[sub];
  if (entry === undefined) notFound();

  return (
    <ArticleLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: SECTION_TITLE, href: '/past-and-present/' },
        { label: entry.title },
      ]}
    >
      <entry.Component />
    </ArticleLayout>
  );
}
