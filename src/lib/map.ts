import * as maplibregl from "maplibre-gl";

import { DARK_THEME_OVERRIDES, MAP_STYLE_URL } from "@blip/shared";

export { MAP_STYLE_URL, MAP_TEXT_FONT } from "@blip/shared";

function applyDarkTheme(map: maplibregl.Map) {
	for (const [layerId, props] of Object.entries(DARK_THEME_OVERRIDES)) {
		if (!map.getLayer(layerId)) continue; // style may add/rename layers over time
		for (const [prop, value] of Object.entries(props)) {
			map.setPaintProperty(layerId, prop, value);
		}
	}
}

/**
 * Initializes the MapLibre map instance.
 * @param {string} containerId - The ID of the HTML element to mount the map.
 * @param {Array} center - [lng, lat] coordinates for the map center.
 * @returns {maplibregl.Map} - The created MapLibre instance.
 */
export const initMap = (containerId: string, center: [number, number] = [-122.4194, 37.7749]) => { // [-87.616, 41.776] is o block
	const map = new maplibregl.Map({
		container: containerId,
		style: MAP_STYLE_URL,
		center,
		zoom: 11,
	});
	map.on("style.load", () => applyDarkTheme(map));
	return map;
};
