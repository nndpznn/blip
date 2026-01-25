import mapboxgl from "mapbox-gl";
import Meet from "@/models/meet";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

if (!MAPBOX_ACCESS_TOKEN) {
	console.error("Missing Mapbox API token in .env file");
  }

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

/**
 * Initializes the Mapbox map instance.
 * @param {string} containerId - The ID of the HTML element to mount the map.
 * @param {Array} center - [lng, lat] coordinates for the map center.
 * @returns {mapboxgl.Map} - The created Mapbox instance.
 */
export const initMap = (containerId: string, center: [number, number] = [-122.4194, 37.7749]) => { // [-87.616, 41.776] is o block
	return new mapboxgl.Map({
		container: containerId,
		style: "mapbox://styles/mapbox/dark-v10",
		center,
		zoom: 11,
	});
};

/**
 * Adds markers for events on the map.
 * @param {mapboxgl.Map} map - The Mapbox map instance.
 * @param {Array} events - Array of event objects with { name, lat, lng }.
 */
export const addEventMarkers = (map: mapboxgl.Map, meets: Meet[]) => {
      meets.forEach((meet) => {
        // Parse the location string from Supabase
		new mapboxgl.Marker({ color: '#FF4500' })
		.setLngLat([meet.location.coordinates[0], meet.location.coordinates[1]])
		.setPopup(new mapboxgl.Popup().setHTML(`<h3>${meet.title}</h3><p>${meet.body}</p>`))
		.addTo(map);
      });
  };