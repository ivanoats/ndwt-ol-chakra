import { describe, expect, it } from 'vitest';

import { fireEvent, render, screen, within } from '@testing-library/react';

import { coordinates } from '../../../domain/coordinates';
import { FacilitySet } from '../../../domain/facility';
import { type Site, siteId } from '../../../domain/site';
import SiteIndex from '../SiteIndex';

const make = (
  partial: Partial<Site> & Pick<Site, 'name' | 'riverName' | 'riverMile'>
): Site => ({
  id: siteId(partial.name.toLowerCase().replaceAll(' ', '-')),
  slug: partial.name.toLowerCase().replaceAll(' ', '-'),
  riverSegment: '',
  bank: '',
  coordinates: coordinates(0, 0),
  facilities: FacilitySet.empty(),
  ...partial,
});

const fixtures: readonly Site[] = [
  make({ name: 'Blalock Canyon', riverName: 'Columbia', riverMile: 234 }),
  make({
    name: 'Hood Park',
    riverName: 'Snake',
    riverMile: 2,
    facilities: FacilitySet.fromFlags({ boatRamp: true, restrooms: true }),
  }),
  make({
    name: 'Hells Gate State Park',
    riverName: 'Snake',
    riverMile: 142,
    facilities: FacilitySet.fromFlags({ boatRamp: true, marina: true }),
  }),
  make({ name: 'Canoe Camp', riverName: 'Clearwater', riverMile: 1 }),
];

const renderIndex = () => render(<SiteIndex sites={fixtures} />);

describe('<SiteIndex />', () => {
  it('renders all sites and a result count by default', () => {
    renderIndex();
    expect(screen.getByTestId('site-index-count')).toHaveTextContent(
      '4 of 4 sites'
    );
    const results = screen.getByTestId('site-index-results');
    expect(within(results).getAllByRole('listitem')).toHaveLength(4);
  });

  it('narrows results when the user types into the name filter', () => {
    renderIndex();
    fireEvent.change(screen.getByTestId('site-index-query'), {
      target: { value: 'blal' },
    });
    expect(screen.getByTestId('site-index-count')).toHaveTextContent(
      '1 of 4 sites'
    );
    expect(screen.getByTestId('site-index-row-blalock-canyon')).toBeVisible();
  });

  it('filters by river when the dropdown changes', () => {
    renderIndex();
    fireEvent.change(screen.getByTestId('site-index-river'), {
      target: { value: 'Snake' },
    });
    expect(screen.getByTestId('site-index-count')).toHaveTextContent(
      '2 of 4 sites'
    );
    expect(screen.getByTestId('site-index-row-hood-park')).toBeVisible();
    expect(
      screen.queryByTestId('site-index-row-blalock-canyon')
    ).not.toBeInTheDocument();
  });

  it('AND-combines facility toggles with the other filters', () => {
    renderIndex();
    fireEvent.click(screen.getByTestId('site-index-facility-marina'));
    expect(screen.getByTestId('site-index-count')).toHaveTextContent(
      '1 of 4 sites'
    );
    expect(
      screen.getByTestId('site-index-row-hells-gate-state-park')
    ).toBeVisible();
  });

  it('toggles a facility off when its button is clicked twice', () => {
    renderIndex();
    const button = screen.getByTestId('site-index-facility-marina');
    fireEvent.click(button); // on
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button); // off
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('site-index-count')).toHaveTextContent(
      '4 of 4 sites'
    );
  });

  it('switches sort order to alphabetical', () => {
    renderIndex();
    fireEvent.change(screen.getByTestId('site-index-sort'), {
      target: { value: 'alpha' },
    });
    // First row's link text is the alphabetically-first site name
    // across the fixtures (Blalock Canyon). Reach the first link
    // via getAllByRole + index — `rows[0]!` would trip
    // DeepSource's no-non-null-assertion rule.
    const links = within(screen.getByTestId('site-index-results')).getAllByRole(
      'link'
    );
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveTextContent('Blalock Canyon');
  });

  it('points each result row at /sites/<slug>', () => {
    renderIndex();
    expect(screen.getByTestId('site-index-row-blalock-canyon')).toHaveAttribute(
      'href',
      '/sites/blalock-canyon'
    );
  });
});
