/**
 * Builds a Google Maps URL for a meet location.
 *
 * `coords` is GeoJSON order, [lng, lat]. Google's `query` accepts "lat,lng", which drops a pin at
 * the exact spot. (The previous version put the coordinates in `query_place_id`, which only accepts
 * a real Google Place ID, so those links did not point at the right place.)
 * If the coordinates are missing or out of range, falls back to searching by place name.
 */
export const encodeToGoogleMaps = (placeName: string, coords: number[]): string => {
  const baseUrl = "https://www.google.com/maps/search/?api=1";
  const [lng, lat] = coords ?? [];
  const valid =
    Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const query = valid ? `${lat},${lng}` : placeName;
  return `${baseUrl}&query=${encodeURIComponent(query)}`;
};
