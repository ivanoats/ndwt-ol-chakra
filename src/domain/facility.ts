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

export class FacilitySet {
  private readonly set: ReadonlySet<Facility>;

  private constructor(set: ReadonlySet<Facility>) {
    this.set = set;
  }

  static empty(): FacilitySet {
    return new FacilitySet(new Set());
  }

  static fromFlags(flags: Partial<Record<Facility, boolean>>): FacilitySet {
    const present = new Set<Facility>();
    for (const f of FACILITIES) {
      if (flags[f]) present.add(f);
    }
    return new FacilitySet(present);
  }

  has(f: Facility): boolean {
    return this.set.has(f);
  }

  toArray(): readonly Facility[] {
    return FACILITIES.filter((f) => this.set.has(f));
  }

  get size(): number {
    return this.set.size;
  }
}
