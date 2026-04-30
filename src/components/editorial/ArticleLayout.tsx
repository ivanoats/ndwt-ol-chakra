import { type ReactNode } from 'react';
import { css } from 'styled-system/css';

import { Link } from '../ui/link';

interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

interface ArticleLayoutProps {
  readonly children: ReactNode;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
}

const pageStyle = css({
  maxWidth: '3xl',
  marginX: 'auto',
  paddingX: { base: '4', md: '6' },
  paddingY: { base: '6', md: '10' },
  color: 'fg.default',
  '@media print': {
    maxWidth: 'none',
    paddingY: '0',
  },
});

const breadcrumbStyle = css({
  fontSize: 'sm',
  color: 'fg.muted',
  marginBottom: '4',
  '@media print': { display: 'none' },
});

const proseStyle = css({
  fontSize: { base: 'md', md: 'lg' },
  lineHeight: 'relaxed',
  '& h1': {
    fontSize: { base: '2xl', md: '3xl' },
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '4',
  },
  '& h2': {
    fontSize: { base: 'xl', md: '2xl' },
    fontWeight: 'semibold',
    marginTop: '8',
    marginBottom: '3',
  },
  '& h3': {
    fontSize: 'lg',
    fontWeight: 'semibold',
    marginTop: '6',
    marginBottom: '2',
  },
  '& p': {
    margin: 0,
    marginBottom: '4',
  },
  '& ul, & ol': {
    paddingLeft: '6',
    marginBottom: '4',
  },
  '& li': {
    marginBottom: '2',
  },
  '& a': {
    color: 'colorPalette.11',
    colorPalette: 'green',
    textDecoration: 'underline',
    textDecorationThickness: '1px',
    textUnderlineOffset: '2px',
    _hover: { color: 'colorPalette.12' },
  },
  '& strong': { fontWeight: 'semibold' },
  '& hr': {
    border: 'none',
    borderTopWidth: '1px',
    borderColor: 'gray.6',
    marginY: '8',
  },
  // The attribution paragraph at the end of every editorial page
  // sits in italics — keep it muted so the substantive content
  // reads first.
  '& em': { color: 'fg.muted' },
});

const renderCrumb = (item: BreadcrumbItem, last: boolean) => {
  if (item.href === undefined || last) {
    return <span key={item.label}>{item.label}</span>;
  }
  return (
    <span key={item.label}>
      <Link href={item.href}>{item.label}</Link>
      {' / '}
    </span>
  );
};

export default function ArticleLayout({
  children,
  breadcrumbs,
}: ArticleLayoutProps) {
  return (
    <article className={pageStyle}>
      {breadcrumbs === undefined || breadcrumbs.length === 0 ? null : (
        <p className={breadcrumbStyle}>
          {breadcrumbs.map((item, index) =>
            renderCrumb(item, index === breadcrumbs.length - 1)
          )}
        </p>
      )}
      <div className={proseStyle}>{children}</div>
    </article>
  );
}
