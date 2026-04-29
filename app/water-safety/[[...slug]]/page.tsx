import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ComponentType } from 'react';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import SectionIndex from '@/components/editorial/SectionIndex';

import BargeTraffic from '../../../content/water-safety/barge-traffic.mdx';
import Communications from '../../../content/water-safety/communications.mdx';
import FloatPlans from '../../../content/water-safety/float-plans.mdx';
import ReadingTheRivers from '../../../content/water-safety/reading-the-rivers.mdx';
import SafetyGear from '../../../content/water-safety/safety-gear.mdx';
import Weather from '../../../content/water-safety/weather.mdx';

interface PageEntry {
  readonly title: string;
  readonly summary: string;
  readonly Component: ComponentType;
}

const PAGES: Readonly<Record<string, PageEntry>> = {
  weather: {
    title: 'Weather',
    summary:
      'Forecast sources, fog and wind hazards, and protecting yourself ' +
      'from hypothermia.',
    Component: Weather,
  },
  'barge-traffic': {
    title: 'Barge Traffic',
    summary:
      'Sharing the river with commercial tugs and tows along the ' +
      'Columbia and Snake.',
    Component: BargeTraffic,
  },
  communications: {
    title: 'Communications',
    summary:
      'Marine radios, mobile coverage gaps, and getting word out when ' +
      'things go sideways.',
    Component: Communications,
  },
  'reading-the-rivers': {
    title: 'Reading the Rivers',
    summary:
      'Currents, eddies, and what river features tell you before you ' +
      'commit to a line.',
    Component: ReadingTheRivers,
  },
  'float-plans': {
    title: 'Float Plans',
    summary:
      'Filing a float plan so someone ashore knows where to look if ' +
      'you do not arrive on schedule.',
    Component: FloatPlans,
  },
  'safety-gear': {
    title: 'Safety Gear',
    summary:
      'Life jackets, throw devices, and recommended electronics for ' +
      'long-corridor trips.',
    Component: SafetyGear,
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

const SECTION_TITLE = 'Water Safety';
const SECTION_DESC =
  'Practical safety guidance for paddlers and small-boaters on the ' +
  'Northwest Discovery Water Trail. Originally published on ndwt.org; ' +
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
    title: `${entry.title} — ${SECTION_TITLE}`,
    description: entry.summary,
  };
}

export default async function WaterSafetyPage({ params }: PageProps) {
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
          basePath="/water-safety/"
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
        { label: SECTION_TITLE, href: '/water-safety/' },
        { label: entry.title },
      ]}
    >
      <entry.Component />
    </ArticleLayout>
  );
}
