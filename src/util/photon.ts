/**
 * Place search via Photon (OpenStreetMap geocoder, no API key).
 * Pure fetch + mapping only, so it can move to a shared package for the mobile app.
 */

const PHOTON_URL = "https://photon.komoot.io/api/";

/** California bounding box: minLng, minLat, maxLng, maxLat. */
const CALIFORNIA_BBOX = "-124.4,32.5,-114.1,42.0";

export interface PlaceSuggestion {
	/** Stable key for lists, e.g. "N4661543003". */
	id: string;
	name: string;
	address: string;
	coordinates: [number, number]; // [lng, lat]
	category: string | null; // null for plain addresses
}

interface PhotonProperties {
	osm_type?: string;
	osm_id?: number;
	osm_key?: string;
	osm_value?: string;
	name?: string;
	housenumber?: string;
	street?: string;
	city?: string;
	district?: string;
	locality?: string;
	state?: string;
	postcode?: string;
}

interface PhotonFeature {
	geometry?: { coordinates?: [number, number] };
	properties?: PhotonProperties;
}

function formatAddress(p: PhotonProperties): string {
	const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
	const city = p.city || p.district || p.locality;
	const stateZip = [p.state, p.postcode].filter(Boolean).join(" ");
	return [streetLine, city, stateZip].filter(Boolean).join(", ");
}

/** OSM features that are never a sensible place to hold a meet. */
const JUNK_HIGHWAY_VALUES = new Set([
	"bus_stop", "platform", "service", "crossing", "traffic_signals", "street_lamp",
	"footway", "path", "steps", "cycleway", "track", "pedestrian", "corridor",
]);
const JUNK_OSM_VALUES = new Set(["construction", "proposed", "abandoned", "disused"]);
const JUNK_NAME = /\b(under construction|future|proposed|coming soon)\b/i;

function isJunk(p: PhotonProperties): boolean {
	if (p.osm_value && JUNK_OSM_VALUES.has(p.osm_value)) return true;
	if (p.osm_key === "highway" && p.osm_value && JUNK_HIGHWAY_VALUES.has(p.osm_value)) return true;
	if (p.name && JUNK_NAME.test(p.name)) return true;
	return false;
}

function toSuggestion(feature: PhotonFeature): PlaceSuggestion | null {
	const p = feature.properties;
	const coordinates = feature.geometry?.coordinates;
	if (!p || !coordinates || coordinates.length < 2) return null;
	if (isJunk(p)) return null;

	const address = formatAddress(p);
	const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
	const name = p.name || streetLine || address;
	if (!name) return null;

	// Photon marks plain addresses as osm_key "place"/"highway"/"building"; everything else is a named place.
	const isAddressLike =
		!p.name || p.osm_key === "place" || p.osm_key === "highway" || p.osm_key === "building";

	return {
		id: `${p.osm_type ?? "X"}${p.osm_id ?? `${coordinates[0]},${coordinates[1]}`}`,
		name,
		// Keep California-only validation working ("California" or ", CA" in the address).
		address: address || name,
		coordinates: [coordinates[0], coordinates[1]],
		category: isAddressLike ? null : (p.osm_value ?? p.osm_key ?? null),
	};
}

/** Over-fetch so there is still a full list after junk is filtered out. */
const FETCH_LIMIT = 15;

export interface SearchBias {
	lat: number;
	lon: number;
}

/** The public Photon host is occasionally flaky; retry once on network/429/5xx. */
async function fetchPhoton(url: string, signal?: AbortSignal): Promise<Response> {
	let lastError: unknown;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const res = await fetch(url, { signal });
			if (res.ok) return res;
			if (res.status !== 429 && res.status < 500) {
				throw new Error(`Place search failed (${res.status})`);
			}
			lastError = new Error(`Place search failed (${res.status})`);
		} catch (err) {
			if ((err as Error).name === "AbortError") throw err;
			lastError = err;
		}
		if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 400));
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
	}
	throw lastError instanceof Error ? lastError : new Error("Place search failed");
}

export async function searchPlaces(
	query: string,
	options: { signal?: AbortSignal; limit?: number; bias?: SearchBias | null } = {},
): Promise<PlaceSuggestion[]> {
	const limit = options.limit ?? 5;
	const params = new URLSearchParams({
		q: query,
		limit: String(Math.max(limit, FETCH_LIMIT)),
		lang: "en",
		bbox: CALIFORNIA_BBOX,
	});
	// Rank results near this point first (e.g. the map center) instead of the whole state.
	if (options.bias) {
		params.set("lat", String(options.bias.lat));
		params.set("lon", String(options.bias.lon));
	}

	const res = await fetchPhoton(`${PHOTON_URL}?${params.toString()}`, options.signal);

	const data = (await res.json()) as { features?: PhotonFeature[] };
	const seen = new Set<string>();
	const suggestions: PlaceSuggestion[] = [];
	for (const feature of data.features ?? []) {
		const s = toSuggestion(feature);
		if (!s || seen.has(s.id)) continue;
		// Collapse duplicate map objects (e.g. a building and its POI node with the same name/address).
		const dupKey = `${s.name}|${s.address}`.toLowerCase();
		if (seen.has(dupKey)) continue;
		seen.add(s.id);
		seen.add(dupKey);
		suggestions.push(s);
		if (suggestions.length >= limit) break;
	}
	return suggestions;
}
