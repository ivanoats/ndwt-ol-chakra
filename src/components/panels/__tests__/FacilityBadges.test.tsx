import { describe, expect, it } from 'vitest';

import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';

import { FacilitySet } from '../../../domain';
import FacilityBadges from '../FacilityBadges';

const renderBadges = (facilities: FacilitySet) =>
  render(
    <ChakraProvider>
      <FacilityBadges facilities={facilities} />
    </ChakraProvider>
  );

describe('<FacilityBadges />', () => {
  it('renders nothing for an empty FacilitySet', () => {
    renderBadges(FacilitySet.empty());
    expect(
      screen.queryByLabelText('Facilities at this site')
    ).not.toBeInTheDocument();
  });

  it('renders a friendly label for each present facility', () => {
    renderBadges(
      FacilitySet.fromFlags({
        restrooms: true,
        boatRamp: true,
        adaAccess: true,
      })
    );
    expect(screen.getByText('Restrooms')).toBeInTheDocument();
    expect(screen.getByText('Boat ramp')).toBeInTheDocument();
    expect(screen.getByText('ADA access')).toBeInTheDocument();
  });

  it('omits absent facilities', () => {
    renderBadges(FacilitySet.fromFlags({ marina: true }));
    expect(screen.getByText('Marina')).toBeInTheDocument();
    expect(screen.queryByText('Restrooms')).not.toBeInTheDocument();
    expect(screen.queryByText('Boat ramp')).not.toBeInTheDocument();
  });
});
