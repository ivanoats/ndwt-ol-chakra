import { describe, expect, it } from 'vitest';

import { render, screen } from '@testing-library/react';

import { FacilitySet } from '../../../domain';
import FacilityBadges from '../FacilityBadges';

describe('<FacilityBadges />', () => {
  it('renders nothing for an empty FacilitySet', () => {
    render(<FacilityBadges facilities={FacilitySet.empty()} />);
    expect(
      screen.queryByLabelText('Facilities at this site')
    ).not.toBeInTheDocument();
  });

  it('renders a friendly label for each present facility', () => {
    render(
      <FacilityBadges
        facilities={FacilitySet.fromFlags({
          restrooms: true,
          boatRamp: true,
          adaAccess: true,
        })}
      />
    );
    expect(screen.getByText('Restrooms')).toBeInTheDocument();
    expect(screen.getByText('Boat ramp')).toBeInTheDocument();
    expect(screen.getByText('ADA access')).toBeInTheDocument();
  });

  it('omits absent facilities', () => {
    render(
      <FacilityBadges facilities={FacilitySet.fromFlags({ marina: true })} />
    );
    expect(screen.getByText('Marina')).toBeInTheDocument();
    expect(screen.queryByText('Restrooms')).not.toBeInTheDocument();
    expect(screen.queryByText('Boat ramp')).not.toBeInTheDocument();
  });
});
