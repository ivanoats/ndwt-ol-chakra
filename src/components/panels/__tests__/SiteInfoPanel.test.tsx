import { afterEach, describe, expect, it, vi } from 'vitest';

import { act, fireEvent, render, screen } from '@testing-library/react';

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
      await screen.findByRole('heading', {
        name: /Columbia River — Mile 234/u,
      })
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
    expect(clicks[0]?.download).toBe('columbia-mile-234.gpx');
    expect(clicks[0]?.href).toContain('blob:test-url');

    HTMLAnchorElement.prototype.click = originalClick;
  });
});
