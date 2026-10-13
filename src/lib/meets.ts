import { supabase } from "@/clients/supabaseClient";
import type Meet from "@/models/meet";
import {
	MEET_PAGE_SIZE,
	localDateString,
	planMeetPage,
	type MeetCursor,
	type MeetSort,
} from "@/util/meetPaging";

/** Only what meet cards render; skips `links`/`mapsLink` and anything else on the row. */
const LIST_COLUMNS = "id, created_at, title, body, images, date, startTime, endTime, organizerId, location";

/** Only what map pins and popups need. */
const MAP_COLUMNS = "id, title, date, startTime, endTime, organizerId, location";

/** One page of meets for the list view. `error` is set when the query fails. */
export async function fetchMeetPage(
	cursor: MeetCursor,
	sort: MeetSort,
	pageSize: number = MEET_PAGE_SIZE,
): Promise<{ meets: Meet[]; error: string | null }> {
	const today = localDateString();
	const plan = planMeetPage(cursor, sort, today, pageSize);

	let query = supabase.from("meets").select(LIST_COLUMNS);
	if (plan.filter.kind === "gte") {
		query = query.gte("date", plan.filter.today);
	} else if (plan.filter.kind === "past") {
		query = query.or(`date.lt.${plan.filter.today},date.is.null`);
	}
	for (const order of plan.orders) {
		query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
	}

	const { data, error } = await query.range(plan.from, plan.to);
	if (error) return { meets: [], error: error.message };
	return { meets: (data ?? []) as unknown as Meet[], error: null };
}

/** Upcoming meets (date today or later) with only the columns the map needs. */
export async function fetchUpcomingMapMeets(): Promise<Meet[]> {
	const { data, error } = await supabase
		.from("meets")
		.select(MAP_COLUMNS)
		.gte("date", localDateString());
	if (error) {
		console.error("Error fetching meets for the map:", error.message);
		return [];
	}
	return (data ?? []) as unknown as Meet[];
}

export type AttendeeSummary = Record<string, { count: number; attending: boolean }>;

const SUMMARY_CHUNK = 100;

/**
 * Attendee count and "is the current user attending" for the given meets, via the
 * `meet_attendee_summary` SQL function. Meets with no attendees are absent from the result.
 */
export async function fetchAttendeeSummary(meetIds: Array<number | string>): Promise<AttendeeSummary> {
	const summary: AttendeeSummary = {};
	for (let i = 0; i < meetIds.length; i += SUMMARY_CHUNK) {
		const chunk = meetIds.slice(i, i + SUMMARY_CHUNK);
		const { data, error } = await supabase.rpc("meet_attendee_summary", { meet_ids: chunk });
		if (error) {
			console.error("Error fetching attendee summary:", error.message);
			continue;
		}
		for (const row of (data ?? []) as Array<{ meet_id: number | string; attendee_count: number; is_attending: boolean }>) {
			summary[String(row.meet_id)] = { count: row.attendee_count, attending: row.is_attending };
		}
	}
	return summary;
}
