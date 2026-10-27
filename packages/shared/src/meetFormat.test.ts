import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAddress, formatMeetDate, formatMeetTimes, formatMeetWhen } from "./meetFormat";

const now = new Date(2026, 9, 26); // Oct 26, 2026

test("formats a date as a calendar day without a timezone shift", () => {
	assert.equal(formatMeetDate("2026-11-07", now), "Sat, Nov 7");
});

test("adds the year when it differs from the current year", () => {
	assert.equal(formatMeetDate("2027-01-02", now), "Sat, Jan 2, 2027");
});

test("accepts a full ISO timestamp but uses only the date part", () => {
	assert.equal(formatMeetDate("2026-11-07T23:30:00", now), "Sat, Nov 7");
});

test("returns null for missing or invalid dates", () => {
	assert.equal(formatMeetDate(null, now), null);
	assert.equal(formatMeetDate("", now), null);
	assert.equal(formatMeetDate("soon", now), null);
	assert.equal(formatMeetDate("2026-02-31", now), null);
});

test("formats a time range and a lone start time", () => {
	assert.equal(formatMeetTimes({ startTime: "19:00:00", endTime: "21:30:00" }), "7:00 PM – 9:30 PM");
	assert.equal(formatMeetTimes({ startTime: "19:00:00" }), "7:00 PM");
	assert.equal(formatMeetTimes({ start_time: "09:05", end_time: "09:05" }), "9:05 AM");
	assert.equal(formatMeetTimes({ endTime: "21:00:00" }), null);
});

test("formatMeetWhen combines date and times", () => {
	assert.equal(formatMeetWhen({ date: "2026-11-07", startTime: "19:00:00", endTime: "21:00:00" }, now), "Sat, Nov 7 · 7:00 PM – 9:00 PM");
	assert.equal(formatMeetWhen({ date: "2026-11-07" }, now), "Sat, Nov 7");
	assert.equal(formatMeetWhen({}, now), "No date");
});

test("strips the country from addresses", () => {
	assert.equal(formatAddress("595 Redwood Hwy, Mill Valley, CA 94941, United States"), "595 Redwood Hwy, Mill Valley, CA 94941");
	assert.equal(formatAddress("Somewhere"), "Somewhere");
});
