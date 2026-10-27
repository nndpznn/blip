import { to12Hour } from "./time";

interface MeetWhenInput {
	date?: string | null;
	startTime?: string | null;
	start_time?: string | null;
	endTime?: string | null;
	end_time?: string | null;
}

/**
 * "Sat, Nov 7" (adds the year when it is not `now`'s year). The date is read as a plain
 * calendar day, not a UTC instant, so it never shifts a day with the viewer's timezone.
 * Returns null when there is no valid date.
 */
export function formatMeetDate(date: string | null | undefined, now: Date = new Date()): string | null {
	if (!date) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date));
	if (!match) return null;
	const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const local = new Date(y, m - 1, d);
	if (isNaN(local.getTime()) || local.getMonth() !== m - 1) return null;
	return local.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		...(y !== now.getFullYear() ? { year: "numeric" as const } : {}),
	});
}

/** "7:00 PM – 9:00 PM", "7:00 PM", or null when there is no start time. */
export function formatMeetTimes(meet: MeetWhenInput): string | null {
	const start = meet.startTime ?? meet.start_time;
	const end = meet.endTime ?? meet.end_time;
	if (!start) return null;
	const startText = to12Hour(start);
	if (!end) return startText;
	const endText = to12Hour(end);
	return endText === startText ? startText : `${startText} – ${endText}`;
}

/** One line for cards: "Sat, Nov 7 · 7:00 PM – 9:00 PM", "Sat, Nov 7", or "No date". */
export function formatMeetWhen(meet: MeetWhenInput, now: Date = new Date()): string {
	const date = formatMeetDate(meet.date, now);
	if (!date) return "No date";
	const times = formatMeetTimes(meet);
	return times ? `${date} · ${times}` : date;
}

/** Removes a trailing ", United States" from an address. */
export function formatAddress(address: string): string {
	const i = address.lastIndexOf(", United States");
	return i >= 0 ? address.slice(0, i) : address;
}
