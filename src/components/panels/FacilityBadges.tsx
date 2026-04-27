import { type Facility, type FacilitySet } from '../../domain';
import { Badge } from '../ui/badge';
import { Stack } from '../ui/stack';

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

export default function FacilityBadges({ facilities }: FacilityBadgesProps) {
  if (facilities.length === 0) return null;

  return (
    <Stack
      direction="row"
      gap="2"
      wrap="wrap"
      aria-label="Facilities at this site"
    >
      {facilities.map((facility) => (
        <Badge key={facility} colorScheme="green">
          {FACILITY_LABELS[facility]}
        </Badge>
      ))}
    </Stack>
  );
}
