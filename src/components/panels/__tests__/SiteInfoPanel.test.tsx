import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, fireEvent, render, screen } from '@testing-library/react';

import { coordinates, FacilitySet, type Site, siteId } from '../../../domain';
import { useSelectedSite } from '../../../store/selected-site';
import SiteInfoPanel from '../SiteInfoPanel';

const baseSite: Site = {
  id: siteId('test-1'),
  name: 'Blalock Canyon',
  riverSegment: 'Lake Umatilla',
  riverName: 'Columbia',
  riverMile: 234,
  bank: 'OR',
  coordinates: coordinates(-120.37, 45.695),
  state: 'OR',
  county: 'Gilliam',
  season: 'year round',
  camping: 'None',
  campingFee: '$10/night',
  contact: 'US Army Corps of Engineers',
  phone: '(555) 555-5555',
  website: 'https://example.org/site',
  notes: 'Popular salmon fishing in autumn.',
  facilities: FacilitySet.fromFlags({ boatRamp: true, restrooms: true }),
};

const renderPanel = () => render(<SiteInfoPanel />);

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
  it('keeps the panel hidden when no site is selected', () => {
    renderPanel();
    // Ark UI Dialog stays in the DOM with data-state="closed" and
    // a `hidden` attribute when not open; we just confirm it's not
    // visible to a real user.
    const panel = screen.getByTestId('site-info-panel');
    expect(panel).toHaveAttribute('data-state', 'closed');
    expect(panel).not.toBeVisible();
  });

  it('renders the title, subheading, and details when a site is selected', async () => {
    renderPanel();
    select(baseSite);

    expect(
      await screen.findByRole('heading', { name: /Blalock Canyon/u })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Columbia River · Mile 234 · Lake Umatilla · OR')
    ).toBeInTheDocument();
    expect(screen.getByText('US Army Corps of Engineers')).toBeInTheDocument();
    expect(screen.getByText('(555) 555-5555')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'https://example.org/site' })
    ).toHaveAttribute('href', 'https://example.org/site');
  });

  it('renders the new state/county/campingFee/notes rows when present', () => {
    renderPanel();
    select(baseSite);
    expect(screen.getByText('Gilliam, OR')).toBeInTheDocument();
    expect(screen.getByText('$10/night')).toBeInTheDocument();
    expect(
      screen.getByText('Popular salmon fishing in autumn.')
    ).toBeInTheDocument();
  });

  it('omits state/county/campingFee/notes rows when absent', () => {
    renderPanel();
    select({
      ...baseSite,
      state: undefined,
      county: undefined,
      campingFee: undefined,
      notes: undefined,
    });
    expect(screen.queryByText('Location')).not.toBeInTheDocument();
    expect(screen.queryByText('Camping fee')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
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

  it('omits empty subheading parts (no leading or doubled separator)', () => {
    renderPanel();
    select({ ...baseSite, riverSegment: '' });
    expect(
      screen.getByText('Columbia River · Mile 234 · OR')
    ).toBeInTheDocument();
    expect(screen.queryByText(/· ·/)).not.toBeInTheDocument();
  });

  it('renders the formatted lat/long coordinates', () => {
    renderPanel();
    select(baseSite);
    expect(screen.getByText('45.69500, -120.37000')).toBeInTheDocument();
  });

  it('exposes a Download GPX waypoint button', () => {
    renderPanel();
    select(baseSite);
    const button = screen.getByTestId('download-gpx-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/Download GPX/);
  });

  it('clicking Download GPX writes a .gpx file via a temporary anchor', () => {
    const createObjectURL = vi.fn(() => 'blob:test-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    const clicks: HTMLAnchorElement[] = [];
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      clicks.push(this);
    };

    renderPanel();
    select(baseSite);
    fireEvent.click(screen.getByTestId('download-gpx-button'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.download).toBe('blalock-canyon-mile-234.gpx');
    expect(clicks[0]?.href).toContain('blob:test-url');

    HTMLAnchorElement.prototype.click = originalClick;
  });
});
