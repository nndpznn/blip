import { test } from "node:test";
import assert from "node:assert/strict";
import { groupMeetsByLocation, locationKey, meetsToFeatureCollection } from "./meetGroups";

const meet = (id: number | string, coordinates: [number, number]) => ({ id, location: { coordinates } });

test("locationKey rounds to 5 decimals", () => {
	assert.equal(locationKey([-122.419412, 37.774912]), "-122.41941,37.77491");
});

test("groups meets at the same place together and keeps order", () => {
	const a = meet(1, [-122.41941, 37.77491]);
	const b = meet(2, [-122.419411, 37.774909]); // same place within rounding
	const c = meet(3, [-118.2437, 34.0522]);
	const groups = groupMeetsByLocation([a, c, b]);
	assert.equal(groups.size, 2);
	assert.deepEqual(groups.get(locationKey(a.location.coordinates))?.map((m) => m.id), [1, 2]);
});

test("drops meets with missing or non-finite coordinates", () => {
	const bad = { id: 9, location: { coordinates: [NaN, 1] as [number, number] } };
	const missing = { id: 10 } as unknown as { id: number; location: { coordinates: [number, number] } };
	assert.equal(groupMeetsByLocation([bad, missing]).size, 0);
	assert.equal(meetsToFeatureCollection([bad, missing]).features.length, 0);
});

test("feature collection has one point per meet with string ids", () => {
	const fc = meetsToFeatureCollection([meet(1, [-122.4, 37.7]), meet("abc", [-118.2, 34.0])]);
	assert.equal(fc.type, "FeatureCollection");
	assert.deepEqual(fc.features.map((f) => f.properties.id), ["1", "abc"]);
	assert.deepEqual(fc.features[0].geometry.coordinates, [-122.4, 37.7]);
});
