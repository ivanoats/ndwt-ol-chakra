import type { JSX } from 'react';

import { Badge, Wrap, WrapItem } from '@chakra-ui/react';

import { type Facility, type FacilitySet } from '../../domain';

interface FacilityBadgesProps {
  readonly facilities: FacilitySet;
}

const FACILITY_LABELS: Record<Facility, string> = {
  restrooms: 'Restrooms',
  potableWater: 'Potable water',
  marineDumpStation: 'Marine dump station',
  dayUseOnly: 'Day use only',
  picnicShelters: 'Picnic shelters',
  boatRamp: 'Boat ramp',
  handCarried: 'Hand-carried launch',
  marina: 'Marina',
  adaAccess: 'ADA access',
};

export default function FacilityBadges({
  facilities,
}: FacilityBadgesProps): JSX.Element | null {
  if (facilities.length === 0) return null;

  return (
    <Wrap spacing={2} aria-label="Facilities at this site">
      {facilities.map((facility) => (
        <WrapItem key={facility}>
          <Badge colorScheme="green" variant="subtle">
            {FACILITY_LABELS[facility]}
          </Badge>
        </WrapItem>
      ))}
    </Wrap>
  );
}
