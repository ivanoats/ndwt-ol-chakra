import { afterEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';

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
});
