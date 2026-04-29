import { afterEach, describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen, within } from '@testing-library/react';

import Header from '../Header';

let pathnameMock = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  pathnameMock = '/';
});

describe('<Header />', () => {
  it('renders the site title and the three nav links', () => {
    render(<Header />);
    expect(screen.getByText(/NW Discovery Water Trail/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Map' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Trip Planning' })
    ).toBeInTheDocument();
  });

  it('marks the home link as the current page when on /', () => {
    pathnameMock = '/';
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'About' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('marks About as the current page on /about/', () => {
    pathnameMock = '/about/';
    render(<Header />);
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('marks Trip Planning as the current page on /trip-planning/', () => {
    pathnameMock = '/trip-planning/';
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Trip Planning' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('marks the Sites link as current on per-site detail pages', () => {
    pathnameMock = '/sites/blalock-canyon/';
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Sites' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  describe('mobile hamburger menu', () => {
    it('renders the toggle button collapsed on mount', () => {
      render(<Header />);
      const toggle = screen.getByRole('button', { name: 'Open menu' });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      // The mobile nav element only exists once the panel is open.
      expect(
        screen.queryByRole('navigation', { name: 'Primary (mobile)' })
      ).not.toBeInTheDocument();
    });

    it('opens the mobile panel when the toggle is clicked', () => {
      render(<Header />);
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      const mobileNav = screen.getByRole('navigation', {
        name: 'Primary (mobile)',
      });
      expect(mobileNav).toBeInTheDocument();
      // Mobile nav surfaces every NAV_ITEMS entry.
      expect(
        within(mobileNav).getByRole('link', { name: 'Map' })
      ).toBeVisible();
      expect(
        within(mobileNav).getByRole('link', { name: 'Safety' })
      ).toBeVisible();
      expect(
        within(mobileNav).getByRole('link', { name: 'Leave No Trace' })
      ).toBeVisible();
      // Toggle flips to "Close menu".
      expect(
        screen.getByRole('button', { name: 'Close menu' })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes the panel when ESC is pressed', () => {
      render(<Header />);
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(
        screen.getByRole('navigation', { name: 'Primary (mobile)' })
      ).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(
        screen.queryByRole('navigation', { name: 'Primary (mobile)' })
      ).not.toBeInTheDocument();
    });

    it('closes the panel on a click outside the header', () => {
      render(<Header />);
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(
        screen.getByRole('navigation', { name: 'Primary (mobile)' })
      ).toBeInTheDocument();
      // Pointer down outside the header triggers the document
      // listener and closes the panel.
      fireEvent.pointerDown(document.body);
      expect(
        screen.queryByRole('navigation', { name: 'Primary (mobile)' })
      ).not.toBeInTheDocument();
    });
  });
});
