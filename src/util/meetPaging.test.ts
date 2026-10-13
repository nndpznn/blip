import { test } from "node:test";
import assert from "node:assert/strict";
import {
	MEET_PAGE_SIZE,
	initialCursor,
	localDateString,
	nextCursor,
	planMeetPage,
} from "./meetPaging";

const TODAY = "2026-10-04";

test("localDateString formats local dates with zero padding", () => {
	assert.equal(localDateString(new Date(2026, 0, 5)), "2026-01-05");
	assert.equal(localDateString(new Date(2026, 11, 31)), "2026-12-31");
});

test("initialCursor: recent respects show-past, upcoming always starts upcoming", () => {
	assert.deepEqual(initialCursor("recent", false), { phase: "upcoming", offset: 0 });
	assert.deepEqual(initialCursor("recent", true), { phase: "all", offset: 0 });
	assert.deepEqual(initialCursor("upcoming", true), { phase: "upcoming", offset: 0 });
});

test("planMeetPage: recent orders by posted date, newest first, with a stable tiebreaker", () => {
	const plan = planMeetPage({ phase: "upcoming", offset: 0 }, "recent", TODAY);
	assert.deepEqual(plan.filter, { kind: "gte", today: TODAY });
	assert.deepEqual(plan.orders, [
		{ column: "created_at", ascending: false },
		{ column: "id", ascending: false },
	]);
});

test("planMeetPage: recent with show-past applies no date filter", () => {
	const plan = planMeetPage({ phase: "all", offset: 0 }, "recent", TODAY);
	assert.deepEqual(plan.filter, { kind: "none" });
});

test("planMeetPage: upcoming sorts soonest first; past phase sorts most recent first", () => {
	const up = planMeetPage({ phase: "upcoming", offset: 0 }, "upcoming", TODAY);
	assert.equal(up.orders[0].column, "date");
	assert.equal(up.orders[0].ascending, true);

	const past = planMeetPage({ phase: "past", offset: 0 }, "upcoming", TODAY);
	assert.deepEqual(past.filter, { kind: "past", today: TODAY });
	assert.equal(past.orders[0].column, "date");
	assert.equal(past.orders[0].ascending, false);
});

test("planMeetPage: range is inclusive and advances with the offset", () => {
	const plan = planMeetPage({ phase: "upcoming", offset: 40 }, "upcoming", TODAY, 20);
	assert.equal(plan.from, 40);
	assert.equal(plan.to, 59);
});

test("nextCursor: a full page advances the offset within the same phase", () => {
	assert.deepEqual(
		nextCursor({ phase: "upcoming", offset: 0 }, "recent", false, MEET_PAGE_SIZE),
		{ phase: "upcoming", offset: MEET_PAGE_SIZE },
	);
});

test("nextCursor: a short page ends the list when there is no past phase", () => {
	assert.equal(nextCursor({ phase: "upcoming", offset: 0 }, "recent", false, 3), null);
	assert.equal(nextCursor({ phase: "upcoming", offset: 0 }, "upcoming", false, 3), null);
	assert.equal(nextCursor({ phase: "all", offset: 20 }, "recent", true, 0), null);
});

test("nextCursor: upcoming sort with show-past moves on to the past phase, then ends", () => {
	assert.deepEqual(
		nextCursor({ phase: "upcoming", offset: 20 }, "upcoming", true, 5),
		{ phase: "past", offset: 0 },
	);
	assert.equal(nextCursor({ phase: "past", offset: 0 }, "upcoming", true, 5), null);
});
