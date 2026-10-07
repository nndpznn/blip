/**
 * Shared meet date/time helpers (previously copy-pasted in the meet card, list and user pages).
 * Pure and dependency-free so they can be unit tested and reused by the mobile app.
 */

/** Raw meet row from Supabase may use date/startTime or date/start_time (strings). */
export type MeetRow = {
	date?: string | null;
	startTime?: string | null;
	start_time?: string | null;
	created_at?: string;
};

/**
 * The meet's start as a local Date. A meet with a date but no start time counts as
 * ending at the end of that day. Returns null when there is no (valid) date.
 */
export function getMeetDateTime(meet: MeetRow): Date | null {
	const dateStr = meet.date != null ? String(meet.date) : null;
	if (!dateStr) return null;
	const timeStr = meet.startTime ?? meet.start_time;
	let iso = dateStr;
	if (timeStr) {
		const t = String(timeStr).replace("Z", "");
		iso = dateStr.includes("T") ? dateStr : `${dateStr}T${t.length <= 5 ? t + ":00" : t}`;
	} else if (!dateStr.includes("T")) {
		iso = `${dateStr}T23:59:59`;
	}
	const d = new Date(iso);
	return isNaN(d.getTime()) ? null : d;
}

/** True when the meet has a valid date/time that is still ahead of `now` (ms since epoch). */
export function isMeetInFuture(meet: MeetRow, now: number = Date.now()): boolean {
	const d = getMeetDateTime(meet);
	return d != null && d.getTime() > now;
}
