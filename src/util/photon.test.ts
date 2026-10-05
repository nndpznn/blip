import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { searchPlaces } from "./photon";

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

type Props = Record<string, string | number>;
const feature = (properties: Props, coordinates: [number, number] = [-118.2, 34.05]) => ({
	geometry: { coordinates },
	properties,
});

function mockFetch(responses: Array<{ status?: number; body?: unknown }>) {
	const urls: string[] = [];
	let i = 0;
	globalThis.fetch = (async (url: string | URL | Request) => {
		urls.push(String(url));
		const r = responses[Math.min(i++, responses.length - 1)];
		const status = r.status ?? 200;
		return new Response(JSON.stringify(r.body ?? { features: [] }), { status });
	}) as typeof fetch;
	return urls;
}

test("maps a Photon POI into a suggestion with a California-style address", async () => {
	mockFetch([
		{
			body: {
				features: [
					feature({
						osm_type: "N", osm_id: 1, osm_key: "amenity", osm_value: "fast_food",
						name: "In-N-Out Burger", housenumber: "100", street: "Main St",
						city: "Pasadena", state: "California", postcode: "91101",
					}),
				],
			},
		},
	]);
	const [s] = await searchPlaces("in-n-out");
	assert.equal(s.name, "In-N-Out Burger");
	assert.equal(s.address, "100 Main St, Pasadena, California 91101");
	assert.equal(s.category, "fast_food");
	assert.deepEqual(s.coordinates, [-118.2, 34.05]);
});

test("filters out junk like bus stops and construction sites", async () => {
	mockFetch([
		{
			body: {
				features: [
					feature({ osm_type: "N", osm_id: 1, osm_key: "highway", osm_value: "bus_stop", name: "Main St Stop" }),
					feature({ osm_type: "W", osm_id: 2, osm_key: "building", osm_value: "construction", name: "Big Box" }),
					feature({ osm_type: "N", osm_id: 3, osm_key: "shop", osm_value: "mall", name: "Future Mall" }),
					feature({ osm_type: "N", osm_id: 4, osm_key: "amenity", osm_value: "cafe", name: "Real Cafe", state: "California" }),
				],
			},
		},
	]);
	const results = await searchPlaces("main");
	assert.deepEqual(results.map((r) => r.name), ["Real Cafe"]);
});

test("dedupes by id and by name+address", async () => {
	const dup = { osm_key: "amenity", osm_value: "cafe", name: "Twin Cafe", street: "A St", city: "LA", state: "California" };
	mockFetch([
		{
			body: {
				features: [
					feature({ ...dup, osm_type: "N", osm_id: 1 }),
					feature({ ...dup, osm_type: "N", osm_id: 1 }), // same id
					feature({ ...dup, osm_type: "W", osm_id: 2 }), // same name + address
				],
			},
		},
	]);
	assert.equal((await searchPlaces("twin")).length, 1);
});

test("respects the result limit", async () => {
	mockFetch([
		{
			body: {
				features: Array.from({ length: 10 }, (_, n) =>
					feature({ osm_type: "N", osm_id: n, osm_key: "amenity", osm_value: "cafe", name: `Cafe ${n}`, state: "California" }),
				),
			},
		},
	]);
	assert.equal((await searchPlaces("cafe", { limit: 3 })).length, 3);
});

test("sends the California bbox and the optional location bias", async () => {
	const urls = mockFetch([{ body: { features: [] } }]);
	await searchPlaces("coffee", { bias: { lat: 34.1, lon: -118.3 } });
	const params = new URL(urls[0]).searchParams;
	assert.equal(params.get("bbox"), "-124.4,32.5,-114.1,42.0");
	assert.equal(params.get("lat"), "34.1");
	assert.equal(params.get("lon"), "-118.3");
});

test("retries once on a 5xx and then succeeds", async () => {
	const urls = mockFetch([{ status: 503 }, { body: { features: [] } }]);
	await searchPlaces("retry");
	assert.equal(urls.length, 2);
});

test("does not retry client errors", async () => {
	const urls = mockFetch([{ status: 400 }]);
	await assert.rejects(searchPlaces("bad"), /400/);
	assert.equal(urls.length, 1);
});
