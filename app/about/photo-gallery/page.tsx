import type { Metadata } from 'next';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import { Heading } from '@/components/ui/heading';
import { Link } from '@/components/ui/link';
import { Text } from '@/components/ui/text';

export const metadata: Metadata = {
  title: 'Photo Gallery — About — Northwest Discovery Water Trail',
  description:
    'Photos of the Northwest Discovery Water Trail are hosted by the ' +
    'Washington Water Trails Association.',
};

// TODO(phase-13): confirm exact WWTA photo-gallery URL with the
// Executive Director before merge. The placeholder below points
// at the WWTA root; if the gallery has its own slug (e.g.
// /photos/), update.
const GALLERY_URL = 'https://www.wwta.org/';

export default function PhotoGalleryPage() {
  return (
    <ArticleLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about/' },
        { label: 'Photo Gallery' },
      ]}
    >
      <Heading as="h1" size="2xl">
        Photo Gallery
      </Heading>
      <Text as="p" css={{ marginTop: '4' }}>
        Photos of the Northwest Discovery Water Trail are maintained by the
        Washington Water Trails Association.
      </Text>
      <Text as="p" css={{ marginTop: '4' }}>
        <Link href={GALLERY_URL} external>
          View the WWTA photo gallery →
        </Link>
      </Text>
      <Text as="p" css={{ marginTop: '6', fontSize: 'sm', color: 'fg.muted' }}>
        Want to contribute a photo? Email a high-resolution image and any
        photographer credit to{' '}
        <Link href="mailto:info@wwta.org" external>
          info@wwta.org
        </Link>
        .
      </Text>
    </ArticleLayout>
  );
}
