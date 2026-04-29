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
    name: 'Test Site',
    riverSegment: '',
    riverName: 'Columbia',
    riverMile: 0,
    bank: '',
    coordinates: coordinates(0, 0),
    facilities: FacilitySet.empty(),
  },
];

describe('<MapApp />', () => {
  it('renders the panel mount point and theme toggle without throwing', () => {
    render(<MapApp sites={fakeSites} />);
    // The site info panel is always mounted (Ark UI semantics) so we
    // can use it as a smoke marker that the component tree rendered.
    expect(screen.getByTestId('site-info-panel')).toBeInTheDocument();
    // Theme toggle button is in the tree too.
    expect(
      screen.getByRole('button', { name: /Activate (light|dark) mode/ })
    ).toBeInTheDocument();
  });
});
