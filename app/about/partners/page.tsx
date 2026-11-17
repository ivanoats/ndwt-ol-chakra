import type { Metadata } from 'next';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import { pageMetadata } from '@/lib/page-metadata';

import Partners from '../../../content/about/partners.mdx';

export const metadata: Metadata = pageMetadata({
  title: 'Partners — About',
  path: '/about/partners/',
  description:
    'Partner organizations that developed and maintain the Northwest ' +
    'Discovery Water Trail, including the National Park Service ' +
    'funder, WWTA manager, and the Columbia River treaty tribes.',
});

export default function PartnersPage() {
  return (
    <ArticleLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about/' },
        { label: 'Partners' },
      ]}
    >
      <Partners />
    </ArticleLayout>
  );
}
