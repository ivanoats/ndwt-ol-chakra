import type { Metadata } from 'next';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import { Heading } from '@/components/ui/heading';
import { Link } from '@/components/ui/link';
import { Text } from '@/components/ui/text';

export const metadata: Metadata = {
  title: 'Contact — About — Northwest Discovery Water Trail',
  description:
    'Get in touch with the Washington Water Trails Association about ' +
    'the Northwest Discovery Water Trail.',
};

export default function ContactPage() {
  return (
    <ArticleLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about/' },
        { label: 'Contact' },
      ]}
    >
      <Heading as="h1" size="2xl">
        Contact
      </Heading>
      <Text as="p" css={{ marginTop: '4' }}>
        For comments, questions, or information about the Northwest Discovery
        Water Trail, contact the Washington Water Trails Association — the
        trail&rsquo;s managing organization.
      </Text>
      <Text as="p" css={{ marginTop: '4' }}>
        Email: <Link href="mailto:info@wwta.org">info@wwta.org</Link>
      </Text>
      <Text as="p" css={{ marginTop: '4' }}>
        For information about Water Trail development and planning, the WWTA
        office can be reached at{' '}
        <Link href="tel:+12065459161">(206) 545-9161</Link> or via{' '}
        <Link href="https://www.wwta.org" external>
          wwta.org
        </Link>
        .
      </Text>
      <Text as="p" css={{ marginTop: '4' }}>
        For issues with this site (the map / data / per-site pages), please open
        an issue at{' '}
        <Link href="https://github.com/ivanoats/ndwt-ol-chakra/issues" external>
          github.com/ivanoats/ndwt-ol-chakra
        </Link>
        .
      </Text>
    </ArticleLayout>
  );
}
