/**
 * Pure paging plan for the meet list (no Supabase imports, so it is unit testable and
 * reusable by the mobile app).
 *
 * Sorts:
 *  - "recent":   newest posted first.
 *  - "upcoming": soonest first; with "show past" on, past meets (most recent first) follow.
 *
 * "Upcoming" is decided by date only (date >= today), so a meet that started earlier today
 * still counts as upcoming until midnight.
 */

export type MeetSort = "recent" | "upcoming";

/** "all": no date filter. "upcoming": date >= today. "past": date < today or no date. */
export type MeetPhase = "all" | "upcoming" | "past";

export interface MeetCursor {
	phase: MeetPhase;
	offset: number;
}

export const MEET_PAGE_SIZE = 20;

export interface MeetOrder {
	column: string;
	ascending: boolean;
}

export type MeetDateFilter =
	| { kind: "none" }
	| { kind: "gte"; today: string }
	| { kind: "past"; today: string };

export interface MeetPagePlan {
	filter: MeetDateFilter;
	orders: MeetOrder[];
	/** Inclusive range, as expected by Supabase `.range(from, to)`. */
	from: number;
	to: number;
}

/** Local calendar date as YYYY-MM-DD (the format of the `date` column). */
export function localDateString(now: Date = new Date()): string {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function initialCursor(sort: MeetSort, showPast: boolean): MeetCursor {
	if (sort === "recent") return { phase: showPast ? "all" : "upcoming", offset: 0 };
	return { phase: "upcoming", offset: 0 };
}

export function planMeetPage(
	cursor: MeetCursor,
	sort: MeetSort,
	today: string,
	pageSize: number = MEET_PAGE_SIZE,
): MeetPagePlan {
	let filter: MeetDateFilter;
	if (cursor.phase === "all") filter = { kind: "none" };
	else if (cursor.phase === "upcoming") filter = { kind: "gte", today };
	else filter = { kind: "past", today };

	// `id` is a final tiebreaker so offset paging is stable.
	let orders: MeetOrder[];
	if (sort === "recent") {
		orders = [
			{ column: "created_at", ascending: false },
			{ column: "id", ascending: false },
		];
	} else if (cursor.phase === "past") {
		orders = [
			{ column: "date", ascending: false },
			{ column: "startTime", ascending: false },
			{ column: "id", ascending: false },
		];
	} else {
		orders = [
			{ column: "date", ascending: true },
			{ column: "startTime", ascending: true },
			{ column: "id", ascending: true },
		];
	}

	return { filter, orders, from: cursor.offset, to: cursor.offset + pageSize - 1 };
}

/**
 * Cursor for the page after the one just fetched, or null when there is nothing more.
 * A short page means the current phase is exhausted.
 */
export function nextCursor(
	cursor: MeetCursor,
	sort: MeetSort,
	showPast: boolean,
	returnedCount: number,
	pageSize: number = MEET_PAGE_SIZE,
): MeetCursor | null {
	if (returnedCount >= pageSize) {
		return { phase: cursor.phase, offset: cursor.offset + pageSize };
	}
	if (sort === "upcoming" && showPast && cursor.phase === "upcoming") {
		return { phase: "past", offset: 0 };
	}
	return null;
}
