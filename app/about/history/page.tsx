import type { Metadata } from 'next';

import ArticleLayout from '@/components/editorial/ArticleLayout';

import History from '../../../content/about/history.mdx';

export const metadata: Metadata = {
  title: 'History — About — Northwest Discovery Water Trail',
  description:
    'The 2005 designation events that established the Northwest ' +
    'Discovery Water Trail — Bonneville Ribbon Cutting, the Mosier ' +
    'Fall Festival, and the Clearwater Cleanup.',
};

export default function HistoryPage() {
  return (
    <ArticleLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about/' },
        { label: 'History' },
      ]}
    >
      <History />
    </ArticleLayout>
  );
}
