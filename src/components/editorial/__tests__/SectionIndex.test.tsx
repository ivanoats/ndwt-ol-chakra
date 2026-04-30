import { describe, expect, it } from 'vitest';

import { render, screen, within } from '@testing-library/react';

import SectionIndex from '../SectionIndex';

const PAGES = [
  {
    slug: 'weather',
    title: 'Weather',
    summary: 'Forecasts and hypothermia.',
  },
  {
    slug: 'barge-traffic',
    title: 'Barge Traffic',
    summary: 'Sharing the river with commercial tugs.',
  },
] as const;

describe('<SectionIndex />', () => {
  it('renders the heading + intro + per-page links', () => {
    render(
      <SectionIndex
        heading="Water Safety"
        intro="Practical guidance for paddlers."
        basePath="/water-safety/"
        pages={PAGES}
      />
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Water Safety' })
    ).toBeInTheDocument();
    expect(screen.getByText('Practical guidance for paddlers.')).toBeVisible();

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    const weather = screen.getByRole('link', { name: /Weather/u });
    expect(weather).toHaveAttribute('href', '/water-safety/weather/');
    expect(weather).toHaveTextContent('Forecasts and hypothermia.');
  });

  it('omits the summary line when an entry has none', () => {
    render(
      <SectionIndex
        heading="River Navigation"
        intro="Operational guidance."
        basePath="/river-navigation/"
        pages={[{ slug: 'lock-and-dam', title: 'Lock & Dam Protocol' }]}
      />
    );
    const link = screen.getByRole('link', { name: /Lock & Dam Protocol/u });
    expect(link).toHaveTextContent('Lock & Dam Protocol');
    // The summary <span> is just absent — no extra muted text under
    // the title.
    expect(link.children).toHaveLength(1);
  });
});
