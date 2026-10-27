import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fromColumns, isCaliforniaAddress, toDateColumn, toTimeColumn, validateMeetForm } from "./meetForm";

const valid = {
	title: "Cars & Coffee",
	body: "Bring your car",
	address: "1 Main St, Los Angeles, CA 90001",
	date: "2030-01-02",
	startTime: "09:00:00",
	endTime: "11:30",
};

describe("validateMeetForm", () => {
	it("accepts a complete form", () => {
		assert.equal(validateMeetForm(valid), null);
	});

	it("requires every field", () => {
		for (const key of ["title", "body", "address", "date", "startTime", "endTime"] as const) {
			assert.match(validateMeetForm({ ...valid, [key]: key === "title" || key === "body" ? " " : null }) ?? "", /incomplete/);
		}
	});

	it("limits the title length", () => {
		assert.match(validateMeetForm({ ...valid, title: "x".repeat(26) }) ?? "", /too long/);
		assert.equal(validateMeetForm({ ...valid, title: "x".repeat(25) }), null);
	});

	it("rejects start at or after end", () => {
		assert.match(validateMeetForm({ ...valid, startTime: "11:30", endTime: "11:30" }) ?? "", /time travelers/);
		assert.match(validateMeetForm({ ...valid, startTime: "12:00", endTime: "11:30" }) ?? "", /time travelers/);
	});

	it("rejects malformed times", () => {
		assert.match(validateMeetForm({ ...valid, startTime: "25:00" }) ?? "", /valid/);
	});

	it("rejects places outside California", () => {
		assert.match(validateMeetForm({ ...valid, address: "5 Elm St, Austin, Texas 78701" }) ?? "", /California/);
	});
});

describe("isCaliforniaAddress", () => {
	it("matches the state name or abbreviation", () => {
		assert.equal(isCaliforniaAddress("Somewhere, California"), true);
		assert.equal(isCaliforniaAddress("Somewhere, CA 90210"), true);
		assert.equal(isCaliforniaAddress("Nowhere, Canada"), false);
	});
});

describe("date/time columns", () => {
	it("formats local date and time", () => {
		const d = new Date(2030, 0, 2, 9, 5);
		assert.equal(toDateColumn(d), "2030-01-02");
		assert.equal(toTimeColumn(d), "09:05:00");
	});

	it("round-trips through fromColumns", () => {
		const d = fromColumns("2030-01-02", "09:05:00");
		assert.ok(d);
		assert.equal(toDateColumn(d), "2030-01-02");
		assert.equal(toTimeColumn(d), "09:05:00");
	});

	it("returns null for malformed values", () => {
		assert.equal(fromColumns(null), null);
		assert.equal(fromColumns("nope"), null);
		assert.equal(fromColumns("2030-01-02", "99:99"), null);
	});
});
