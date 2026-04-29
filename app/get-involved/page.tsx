import type { Metadata } from 'next';
import { css } from 'styled-system/css';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Link } from '@/components/ui/link';
import { Text } from '@/components/ui/text';

export const metadata: Metadata = {
  title: 'Get Involved — Northwest Discovery Water Trail',
  description:
    'Volunteer, donate, or share a trip report from the Northwest ' +
    'Discovery Water Trail through the Washington Water Trails ' +
    'Association.',
};

// TODO(phase-13): confirm exact WWTA URLs with the Executive
// Director before merge. The placeholders below point at the
// WWTA root; if any of these have dedicated slugs
// (e.g. /volunteer/, /donate/, /trips/), tighten them up.
const VOLUNTEER_URL = 'https://www.wwta.org/';
const DONATE_URL = 'https://www.wwta.org/';
const TRIP_REPORTS_URL = 'https://www.wwta.org/';

const cardStyle = css({
  display: 'block',
  paddingX: '5',
  paddingY: '4',
  borderRadius: 'md',
  borderWidth: '1px',
  borderColor: 'gray.6',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  textDecoration: 'none',
  marginBottom: '3',
  _hover: {
    borderColor: 'colorPalette.9',
    colorPalette: 'green',
  },
});

const cardLabelStyle = css({
  display: 'block',
  fontWeight: 'semibold',
  fontSize: 'lg',
});

const cardSummaryStyle = css({
  display: 'block',
  fontSize: 'sm',
  color: 'fg.muted',
  marginTop: '1',
});

interface CtaProps {
  readonly title: string;
  readonly summary: string;
  readonly href: string;
}

const Cta = ({ title, summary, href }: CtaProps) => (
  <Link href={href} className={cardStyle} external>
    <span className={cardLabelStyle}>{title} →</span>
    <span className={cardSummaryStyle}>{summary}</span>
  </Link>
);

export default function GetInvolvedPage() {
  return (
    <ArticleLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Get Involved' }]}
    >
      <Heading as="h1" size="2xl">
        Get Involved
      </Heading>
      <Text as="p" css={{ marginTop: '4' }}>
        The Northwest Discovery Water Trail is managed by the Washington Water
        Trails Association. Volunteer opportunities, donations, and trip reports
        are coordinated through WWTA directly:
      </Text>

      <Box css={{ marginTop: '6' }}>
        <Cta
          title="Volunteer"
          summary="Help maintain the Water Trail with the Washington Water Trails Association."
          href={VOLUNTEER_URL}
        />
        <Cta
          title="Donate"
          summary="Support trail development and maintenance through WWTA."
          href={DONATE_URL}
        />
        <Cta
          title="Share a trip report"
          summary="Tell WWTA about your Water Trail expedition — photos, conditions, route notes welcome."
          href={TRIP_REPORTS_URL}
        />
      </Box>

      <Text as="p" css={{ marginTop: '6', fontSize: 'sm', color: 'fg.muted' }}>
        For other questions, see <Link href="/about/contact/">Contact</Link> or
        visit{' '}
        <Link href="https://www.wwta.org" external>
          wwta.org
        </Link>
        .
      </Text>
    </ArticleLayout>
  );
}
