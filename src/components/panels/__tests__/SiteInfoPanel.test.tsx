import { afterEach, describe, expect, it } from 'vitest';

import { ChakraProvider } from '@chakra-ui/react';
import { act, render, screen } from '@testing-library/react';

import { coordinates, FacilitySet, type Site, siteId } from '../../../domain';
import { useSelectedSite } from '../../../store/selected-site';
import SiteInfoPanel from '../SiteInfoPanel';

const baseSite: Site = {
  id: siteId('test-1'),
  riverSegment: 'Lake Umatilla',
  riverName: 'Columbia',
  riverMile: 234,
  bank: 'OR',
  coordinates: coordinates(-120.37, 45.695),
  season: 'year round',
  camping: 'None',
  contact: 'US Army Corps of Engineers',
  phone: '(555) 555-5555',
  website: 'https://example.org/site',
  facilities: FacilitySet.fromFlags({ boatRamp: true, restrooms: true }),
};

const renderPanel = () =>
  render(
    <ChakraProvider>
      <SiteInfoPanel />
    </ChakraProvider>
  );

const select = (site: Site): void => {
  act(() => {
    useSelectedSite.getState().select(site);
  });
};

afterEach(() => {
  act(() => {
    useSelectedSite.getState().close();
  });
});

describe('<SiteInfoPanel />', () => {
  it('renders no panel content when no site is selected', () => {
    renderPanel();
    expect(screen.queryByTestId('site-info-panel')).not.toBeInTheDocument();
  });

  it('renders the title, subheading, and details when a site is selected', () => {
    renderPanel();
    select(baseSite);

    expect(
      screen.getByRole('heading', { name: /Columbia River — Mile 234/ })
    ).toBeInTheDocument();
    expect(screen.getByText('Lake Umatilla · OR')).toBeInTheDocument();
    expect(screen.getByText('US Army Corps of Engineers')).toBeInTheDocument();
    expect(screen.getByText('(555) 555-5555')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'https://example.org/site' })
    ).toHaveAttribute('href', 'https://example.org/site');
  });

  it('renders facility badges from the site', () => {
    renderPanel();
    select(baseSite);
    expect(screen.getByText('Boat ramp')).toBeInTheDocument();
    expect(screen.getByText('Restrooms')).toBeInTheDocument();
  });

  it('omits the website row when no url is set', () => {
    renderPanel();
    select({ ...baseSite, website: undefined });
    expect(screen.queryByText(/example\.org/)).not.toBeInTheDocument();
  });

  it('omits empty subheading parts (no leading separator)', () => {
    renderPanel();
    select({ ...baseSite, riverSegment: '' });
    expect(screen.getByText('OR')).toBeInTheDocument();
    expect(screen.queryByText(/^· /)).not.toBeInTheDocument();
  });
});
