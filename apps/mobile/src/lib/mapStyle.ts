import { MAP_STYLE_URL, themeMapStyle, type StyleLike } from '@blip/shared';
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';

let cached: Promise<StyleLike | null> | null = null;

/** Fetches the OpenFreeMap dark style once and recolors it toward Mapbox's dark look. Null if the fetch fails. */
function loadThemedStyle(): Promise<StyleLike | null> {
  if (!cached) {
    cached = fetch(MAP_STYLE_URL)
      .then((res) => (res.ok ? (res.json() as Promise<StyleLike>) : null))
      .then((style) => (style ? themeMapStyle(style) : null))
      .catch(() => null);
    cached.then((style) => {
      if (!style) cached = null; // allow a retry next time
    });
  }
  return cached;
}

/** The recolored style once loaded, otherwise the stock style URL (so the map is never blank). */
export function useMapStyle(): string | StyleSpecification {
  const [style, setStyle] = useState<StyleLike | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadThemedStyle().then((s) => {
      if (!cancelled && s) setStyle(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  // The fetched document is a full style; StyleLike only types the part we recolor.
  return style ? (style as unknown as StyleSpecification) : MAP_STYLE_URL;
}
