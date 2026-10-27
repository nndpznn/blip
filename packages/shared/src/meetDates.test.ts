import { test } from "node:test";
import assert from "node:assert/strict";
import { getMeetDateTime, isMeetInFuture } from "./meetDates";

const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

test("getMeetDateTime combines the date with a short or long start time (local time)", () => {
	const short = getMeetDateTime({ date: "2026-12-01", startTime: "18:30" });
	assert.equal(short?.getTime(), at(2026, 12, 1, 18, 30));
	const long = getMeetDateTime({ date: "2026-12-01", startTime: "18:30:00" });
	assert.equal(long?.getTime(), at(2026, 12, 1, 18, 30));
});

test("getMeetDateTime accepts the snake_case start_time column name", () => {
	const d = getMeetDateTime({ date: "2026-12-01", start_time: "07:05" });
	assert.equal(d?.getTime(), at(2026, 12, 1, 7, 5));
});

test("a meet with no start time lasts until the end of its day", () => {
	const d = getMeetDateTime({ date: "2026-12-01" });
	assert.equal(d?.getHours(), 23);
	assert.equal(d?.getMinutes(), 59);
});

test("getMeetDateTime returns null for missing or invalid dates", () => {
	assert.equal(getMeetDateTime({}), null);
	assert.equal(getMeetDateTime({ date: null }), null);
	assert.equal(getMeetDateTime({ date: "not-a-date" }), null);
});

test("isMeetInFuture compares against the supplied time", () => {
	const meet = { date: "2026-12-01", startTime: "18:00" };
	assert.equal(isMeetInFuture(meet, at(2026, 12, 1, 17, 0)), true);
	assert.equal(isMeetInFuture(meet, at(2026, 12, 1, 19, 0)), false);
});

test("a meet without a valid date is never in the future", () => {
	assert.equal(isMeetInFuture({ date: null }, at(2020, 1, 1)), false);
});
