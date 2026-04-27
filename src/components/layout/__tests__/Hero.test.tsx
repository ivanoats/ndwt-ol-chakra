import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import Hero from '../Hero';

describe('<Hero />', () => {
  it('mentions the 367-mile distance and the Canoe Camp / Bonneville endpoints', () => {
    render(<Hero />);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toMatch(/367-mile/);
    expect(heading.textContent).toMatch(/Canoe Camp/);
    expect(heading.textContent).toMatch(/Bonneville Dam/);
  });

  it('explains the marker-click + GPX flow', () => {
    render(<Hero />);
    expect(screen.getByText(/Click any marker/i)).toBeInTheDocument();
    expect(screen.getByText(/GPX/)).toBeInTheDocument();
  });
});
