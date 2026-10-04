import * as maplibregl from "maplibre-gl";

/** Free, keyless vector style (OpenStreetMap data via OpenFreeMap). */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/** Font stack that exists in the OpenFreeMap glyph server. */
export const MAP_TEXT_FONT = ["Noto Sans Regular"];

/**
 * Palette that approximates Mapbox's dark-v10 (charcoal land, slightly lighter
 * water/roads, muted grey labels). OpenFreeMap's stock dark style is near-black;
 * tweak these values to adjust the overall lightness.
 */
const PALETTE = {
	land: "#2c2d2e",
	landuse: "#303131",
	park: "#343636",
	water: "#1a1b1b",
	building: "#333434",
	buildingOutline: "#3d3e3e",
	roadMinor: "#3a3b3b",
	roadMajor: "#484949",
	roadMotorway: "#555656",
	roadCasing: "#202121",
	path: "#353636",
	rail: "#353636",
	boundary: "#5a5b5b",
	label: "#a8a9a9",
	labelRoad: "#8a8b8b",
	labelWater: "#8a8b8c",
	halo: "rgba(10, 10, 10, 0.75)",
};

type PaintOverrides = Record<string, Record<string, string>>;

const DARK_THEME_OVERRIDES: PaintOverrides = {
	background: { "background-color": PALETTE.land },
	water: { "fill-color": PALETTE.water },
	waterway: { "line-color": PALETTE.water },
	water_name: { "text-color": PALETTE.labelWater, "text-halo-color": PALETTE.halo },
	landcover_ice_shelf: { "fill-color": PALETTE.land },
	landcover_glacier: { "fill-color": PALETTE.landuse },
	landcover_wood: { "fill-color": PALETTE.park },
	landuse_park: { "fill-color": PALETTE.park },
	landuse_residential: { "fill-color": PALETTE.landuse },
	building: { "fill-color": PALETTE.building, "fill-outline-color": PALETTE.buildingOutline },
	"aeroway-taxiway": { "line-color": PALETTE.roadMinor },
	"aeroway-runway-casing": { "line-color": PALETTE.roadCasing },
	"aeroway-area": { "fill-color": PALETTE.landuse },
	"aeroway-runway": { "line-color": PALETTE.roadMajor },
	road_area_pier: { "fill-color": PALETTE.land },
	road_pier: { "line-color": PALETTE.land },
	highway_path: { "line-color": PALETTE.path },
	highway_minor: { "line-color": PALETTE.roadMinor },
	highway_major_casing: { "line-color": PALETTE.roadCasing },
	highway_major_inner: { "line-color": PALETTE.roadMajor },
	highway_major_subtle: { "line-color": PALETTE.roadMinor },
	highway_motorway_casing: { "line-color": PALETTE.roadCasing },
	highway_motorway_inner: { "line-color": PALETTE.roadMotorway },
	highway_motorway_subtle: { "line-color": PALETTE.roadMinor },
	railway_transit: { "line-color": PALETTE.rail },
	railway_transit_dashline: { "line-color": PALETTE.land },
	railway_minor: { "line-color": PALETTE.rail },
	railway_minor_dashline: { "line-color": PALETTE.land },
	railway: { "line-color": PALETTE.rail },
	railway_dashline: { "line-color": PALETTE.land },
	highway_name_other: { "text-color": PALETTE.labelRoad, "text-halo-color": PALETTE.halo },
	highway_name_motorway: { "text-color": PALETTE.labelRoad, "text-halo-color": PALETTE.halo },
	boundary_state: { "line-color": PALETTE.boundary },
	"boundary_country_z0-4": { "line-color": PALETTE.boundary },
	"boundary_country_z5-": { "line-color": PALETTE.boundary },
	...Object.fromEntries(
		[
			"place_other",
			"place_suburb",
			"place_village",
			"place_town",
			"place_city",
			"place_city_large",
			"place_state",
			"place_country_other",
			"place_country_minor",
			"place_country_major",
		].map((id) => [id, { "text-color": PALETTE.label, "text-halo-color": PALETTE.halo }]),
	),
};

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
