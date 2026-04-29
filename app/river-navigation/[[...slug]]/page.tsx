import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ComponentType } from 'react';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import SectionIndex from '@/components/editorial/SectionIndex';

import LockAndDam from '../../../content/river-navigation/lock-and-dam.mdx';
import PortageGuide from '../../../content/river-navigation/portage-guide.mdx';

interface PageEntry {
  readonly title: string;
  readonly summary: string;
  readonly Component: ComponentType;
}

const PAGES: Readonly<Record<string, PageEntry>> = {
  'lock-and-dam': {
    title: 'Lock & Dam Protocol',
    summary:
      'Locking through the Portland District navigation locks on the ' +
      'Columbia and Snake. Non-motorized boater rules.',
    Component: LockAndDam,
  },
  'portage-guide': {
    title: 'Portage Guide',
    summary:
      'Portage routes around each of the eight major dams between Lower ' +
      'Granite and Bonneville.',
    Component: PortageGuide,
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

const SECTION_TITLE = 'River Navigation';
const SECTION_DESC =
  'Operational guidance for moving through the dams and managed ' +
  'sections of the Columbia and Snake. Originally published on ' +
  'ndwt.org; reused with permission from the Washington Water Trails ' +
  'Association.';

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

export default async function RiverNavigationPage({ params }: PageProps) {
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
          basePath="/river-navigation/"
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
        { label: SECTION_TITLE, href: '/river-navigation/' },
        { label: entry.title },
      ]}
    >
      <entry.Component />
    </ArticleLayout>
  );
}
