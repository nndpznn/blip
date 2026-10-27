import { test } from "node:test";
import assert from "node:assert/strict";
import { meetFetchStatus } from "./meetLoadStatus";

test("ready when the meet loaded", () => {
	assert.equal(meetFetchStatus(null, true), "ready");
	assert.equal(meetFetchStatus(undefined, true), "ready");
});

test("notFound when no row matched", () => {
	assert.equal(meetFetchStatus({ code: "PGRST116" }, false), "notFound");
	assert.equal(meetFetchStatus(null, false), "notFound");
});

test("notFound when the id is malformed", () => {
	assert.equal(meetFetchStatus({ code: "22P02" }, false), "notFound");
});

test("error for anything else, so the page can offer a retry", () => {
	assert.equal(meetFetchStatus({ code: "42501" }, false), "error");
	assert.equal(meetFetchStatus({ code: "" }, false), "error");
	assert.equal(meetFetchStatus({}, false), "error");
});
