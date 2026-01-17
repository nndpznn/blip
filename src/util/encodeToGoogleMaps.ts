// src/utils/location.ts

/**
 * Converts a location object into a clickable Google Maps URL.
 */

export const encodeToGoogleMaps = (placeName: string, coords: number[]): string => {
  const baseUrl = "https://www.google.com/maps/search/?api=1";
  const query = encodeURIComponent(placeName);
  return `${baseUrl}&query=${query}&query_place_id=${coords[0]},${coords[1]}`;
};