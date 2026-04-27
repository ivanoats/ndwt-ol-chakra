export const FACILITIES = [
  'restrooms',
  'potableWater',
  'marineDumpStation',
  'dayUseOnly',
  'picnicShelters',
  'boatRamp',
  'handCarried',
  'marina',
  'adaAccess',
] as const;

export type Facility = (typeof FACILITIES)[number];

/**
 * Plain readonly array of present facilities. Stored on Site as an
 * array (not a class) so server components can pass Site values to
 * client components — Next 16 only serializes plain JSON across the
 * RSC boundary.
 */
export type FacilitySet = readonly Facility[];

// Static helpers — colocated under the type name for ergonomic
// callsite usage like `FacilitySet.empty()` and
// `FacilitySet.fromFlags({ ... })`.
//
// eslint-disable-next-line @typescript-eslint/no-redeclare
export const FacilitySet = {
  empty: (): FacilitySet => [],
  fromFlags: (flags: Partial<Record<Facility, boolean>>): FacilitySet =>
    FACILITIES.filter((facility) => flags[facility]),
} as const;

export const hasFacility = (set: FacilitySet, facility: Facility): boolean =>
  set.includes(facility);
