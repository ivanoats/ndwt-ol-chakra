import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ComponentType } from 'react';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import SectionIndex from '@/components/editorial/SectionIndex';

import FloraFauna from '../../../content/natural-world/flora-fauna.mdx';
import Geology from '../../../content/natural-world/geology.mdx';
import InvasiveSpecies from '../../../content/natural-world/invasive-species.mdx';

interface PageEntry {
  readonly title: string;
  readonly summary: string;
  readonly Component: ComponentType;
}

const PAGES: Readonly<Record<string, PageEntry>> = {
  'flora-fauna': {
    title: 'Flora & Fauna',
    summary:
      'Endangered species, salmon life cycle, and the wildlife refuges ' +
      'along the Northwest Discovery Water Trail corridor.',
    Component: FloraFauna,
  },
  geology: {
    title: 'Geology',
    summary:
      'Columbia River Plateau basalts, Glacial Lake Missoula, and the ' +
      'Ice Age Floods that carved the corridor.',
    Component: Geology,
  },
  'invasive-species': {
    title: 'Invasive Species',
    summary:
      'Why invasives matter, the zebra-mussel threat, and Clean / Drain ' +
      '/ Dry steps every boater should follow between waters.',
    Component: InvasiveSpecies,
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

const SECTION_TITLE = 'Natural World';
const SECTION_DESC =
  'Ecological context for the Northwest Discovery Water Trail — the ' +
  'plants, animals, and geological forces that shape the Clearwater, ' +
  'Snake, and Columbia corridor. Originally published on ndwt.org; ' +
  'reused with permission from the Washington Water Trails Association.';

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

export default async function NaturalWorldPage({ params }: PageProps) {
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
          basePath="/natural-world/"
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
        { label: SECTION_TITLE, href: '/natural-world/' },
        { label: entry.title },
      ]}
    >
      <entry.Component />
    </ArticleLayout>
  );
}
