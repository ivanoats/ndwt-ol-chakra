import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';

import { coordinates, FacilitySet, type Site, siteId } from '../domain';

vi.mock('../components/map', () => ({
  default: () => null,
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

import MapApp from '../components/MapApp';

const fakeSites: readonly Site[] = [
  {
    id: siteId('test'),
    riverSegment: '',
    riverName: 'Columbia',
    riverMile: 0,
    bank: '',
    coordinates: coordinates(0, 0),
    facilities: FacilitySet.empty(),
  },
];

describe('<MapApp />', () => {
  it('renders the page title', () => {
    render(<MapApp sites={fakeSites} />);
    expect(
      screen.getByText('Northwest Discovery Water Trail')
    ).toBeInTheDocument();
  });
});
