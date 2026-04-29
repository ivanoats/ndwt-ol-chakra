import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import ArticleLayout from '../ArticleLayout';

describe('<ArticleLayout />', () => {
  it('renders the children inside an article element', () => {
    render(
      <ArticleLayout>
        <h1>Weather</h1>
        <p>Body text.</p>
      </ArticleLayout>
    );
    const article = screen.getByRole('article');
    expect(article).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Weather' })
    );
    expect(article).toHaveTextContent('Body text.');
  });

  it('renders breadcrumbs with linked and unlinked segments', () => {
    render(
      <ArticleLayout
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Water Safety', href: '/water-safety/' },
          { label: 'Weather' },
        ]}
      >
        <h1>Weather</h1>
      </ArticleLayout>
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByRole('link', { name: 'Water Safety' })).toHaveAttribute(
      'href',
      '/water-safety/'
    );
    // Trailing crumb is plain text, not a link.
    expect(
      screen.queryByRole('link', { name: 'Weather' })
    ).not.toBeInTheDocument();
  });

  it('omits the breadcrumb row when no breadcrumbs are provided', () => {
    render(
      <ArticleLayout>
        <h1>Stand-alone</h1>
      </ArticleLayout>
    );
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });
});
