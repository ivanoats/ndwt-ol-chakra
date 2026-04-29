import type { Metadata } from 'next';

import ArticleLayout from '@/components/editorial/ArticleLayout';

import LeaveNoTrace from '../../content/leave-no-trace.mdx';

export const metadata: Metadata = {
  title: 'Leave No Trace — Northwest Discovery Water Trail',
  description:
    'The seven Leave No Trace principles applied to paddling and ' +
    'camping along the Northwest Discovery Water Trail.',
};

export default function LeaveNoTracePage() {
  return (
    <ArticleLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Leave No Trace' }]}
    >
      <LeaveNoTrace />
    </ArticleLayout>
  );
}
