import { test } from "node:test";
import assert from "node:assert/strict";
import { ilikeLiteral } from "./username";

test("leaves ordinary usernames alone", () => {
	assert.equal(ilikeLiteral("Nolan"), "Nolan");
	assert.equal(ilikeLiteral("car.guy-99"), "car.guy-99");
});

test("escapes ilike wildcards so they match literally", () => {
	assert.equal(ilikeLiteral("100%_real"), "100\\%\\_real");
	assert.equal(ilikeLiteral("a_b"), "a\\_b");
});

test("escapes backslashes first so escapes are not doubled up", () => {
	assert.equal(ilikeLiteral("a\\b"), "a\\\\b");
});
