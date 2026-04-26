export interface Coordinates {
  readonly longitude: number;
  readonly latitude: number;
}

export const coordinates = (
  longitude: number,
  latitude: number
): Coordinates => ({
  longitude,
  latitude,
});
