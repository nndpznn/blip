import { test } from "node:test";
import assert from "node:assert/strict";
import { to12Hour } from "./time";

test("formats afternoon, morning, midnight and noon", () => {
	assert.equal(to12Hour("13:05"), "1:05 PM");
	assert.equal(to12Hour("09:30:00"), "9:30 AM");
	assert.equal(to12Hour("00:15"), "12:15 AM");
	assert.equal(to12Hour("12:00"), "12:00 PM");
});

test("accepts any object that stringifies to a time", () => {
	assert.equal(to12Hour({ toString: () => "18:45:00" }), "6:45 PM");
});
