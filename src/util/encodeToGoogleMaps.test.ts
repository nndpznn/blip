import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeToGoogleMaps } from "./encodeToGoogleMaps";

const query = (url: string) => new URL(url).searchParams;

test("uses lat,lng (GeoJSON coords are [lng, lat]) as the query", () => {
	const url = encodeToGoogleMaps("Cafe", [-118.2437, 34.0522]);
	assert.equal(query(url).get("query"), "34.0522,-118.2437");
	assert.equal(query(url).get("api"), "1");
});

test("never sends coordinates as a place id", () => {
	assert.equal(query(encodeToGoogleMaps("Cafe", [-118.2, 34.05])).has("query_place_id"), false);
});

test("falls back to the place name when coordinates are invalid", () => {
	assert.equal(query(encodeToGoogleMaps("In-N-Out Burger", [Number.NaN, 34])).get("query"), "In-N-Out Burger");
	assert.equal(query(encodeToGoogleMaps("Somewhere", [-200, 34])).get("query"), "Somewhere");
	assert.equal(query(encodeToGoogleMaps("Somewhere", [])).get("query"), "Somewhere");
});

test("encodes names with special characters in the fallback", () => {
	const url = encodeToGoogleMaps("A & B Cafe", []);
	assert.equal(query(url).get("query"), "A & B Cafe");
	assert.ok(!url.includes("A & B"));
});
