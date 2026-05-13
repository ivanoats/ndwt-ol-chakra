import { describe, expect, it, vi } from 'vitest';

import { fireEvent, render, screen } from '@testing-library/react';

import MapSettingsButton from '../MapSettingsButton';

describe('<MapSettingsButton />', () => {
  it('renders an accessible gear button and fires onClick', () => {
    const onClick = vi.fn();

    render(<MapSettingsButton onClick={onClick} />);

    const button = screen.getByTestId('map-settings-button');
    expect(button).toHaveAttribute('aria-label', 'Open map settings');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
