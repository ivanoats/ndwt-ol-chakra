import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import Footer from '../Footer';

describe('<Footer />', () => {
  it('renders the WWTA attribution + GitHub + license links', () => {
    render(<Footer />);
    expect(screen.getByText(/managed by/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Washington Water Trails Association' })
    ).toHaveAttribute('href', 'https://www.wwta.org');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/ivanoats/ndwt-ol-chakra'
    );
    expect(screen.getByRole('link', { name: 'MIT License' })).toHaveAttribute(
      'href',
      'https://github.com/ivanoats/ndwt-ol-chakra/blob/main/LICENSE'
    );
  });

  it('shows the Netlify deploy badge', () => {
    render(<Footer />);
    expect(screen.getByAltText('Netlify deploy status')).toBeInTheDocument();
  });

  it('opens external links in a new tab with safe rel', () => {
    render(<Footer />);
    const githubLink = screen.getByRole('link', { name: 'GitHub' });
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink.getAttribute('rel')).toContain('noopener');
    expect(githubLink.getAttribute('rel')).toContain('noreferrer');
  });
});
