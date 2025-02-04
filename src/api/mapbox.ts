import mapboxgl from "mapbox-gl";
import { Event } from "../types/event"

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
export const initMap = (containerId: string, center: [number, number] = [-122.4194, 37.7749]) => {
	return new mapboxgl.Map({
		container: containerId,
		style: "mapbox://styles/mapbox/streets-v11",
		center,
		zoom: 10,
	});
};

/**
 * Adds markers for events on the map.
 * @param {mapboxgl.Map} map - The Mapbox map instance.
 * @param {Array} events - Array of event objects with { name, lat, lng }.
 */
export const addEventMarkers = (map: mapboxgl.Map, events: Event[]) => {
	events.forEach((event) => {
	  new mapboxgl.Marker()
		.setLngLat([event.lng, event.lat])
		.setPopup(new mapboxgl.Popup().setHTML(`<h3>${event.name}</h3>`))
		.addTo(map);
	});
  };