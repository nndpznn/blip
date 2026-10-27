/**
 * Create/edit meet form rules shared by the apps (mirrors the checks on the web create page).
 * Pure and dependency-free so it can be unit tested.
 */

export const MEET_TITLE_MAX_LENGTH = 25;

export interface MeetFormInput {
	title: string;
	body: string;
	/** Address of the chosen place, or null when no place is selected yet. */
	address: string | null;
	/** "YYYY-MM-DD" */
	date: string | null;
	/** "HH:MM" or "HH:MM:SS" */
	startTime: string | null;
	endTime: string | null;
}

/** Meets are limited to California for now (same check as the web app). */
export function isCaliforniaAddress(address: string): boolean {
	return address.includes("California") || address.includes(", CA");
}

/** Minutes since midnight for "HH:MM[:SS]", or null when malformed. */
function toMinutes(time: string): number | null {
	const m = /^(\d{1,2}):(\d{2})/.exec(time);
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (h > 23 || min > 59) return null;
	return h * 60 + min;
}

/** First problem with the form as a user-facing message, or null when it can be submitted. */
export function validateMeetForm(input: MeetFormInput): string | null {
	const title = input.title.trim();
	if (!title || !input.body.trim() || !input.date || !input.startTime || !input.endTime || !input.address) {
		return "Your meet is incomplete. Please fill out the required sections.";
	}
	if (title.length > MEET_TITLE_MAX_LENGTH) {
		return `Title is too long (${title.length} chars). Limit to ${MEET_TITLE_MAX_LENGTH} characters, please!`;
	}
	const start = toMinutes(input.startTime);
	const end = toMinutes(input.endTime);
	if (start == null || end == null) return "Enter a valid start and end time.";
	if (start >= end) return "Start time is after or at the same time as end time. No time travelers allowed!";
	if (!isCaliforniaAddress(input.address)) {
		return "Blip meets are limited to California for the time being. Sorry for the inconvenience!";
	}
	return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date of `d` as "YYYY-MM-DD" (never UTC-shifted). */
export function toDateColumn(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local time of `d` as "HH:MM:00", the format the `startTime`/`endTime` columns use. */
export function toTimeColumn(d: Date): string {
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Local Date for a "YYYY-MM-DD" column value (+ optional "HH:MM[:SS]"), or null when malformed. */
export function fromColumns(date: string | null, time?: string | null): Date | null {
	if (!date) return null;
	const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
	if (!d) return null;
	let h = 0;
	let min = 0;
	if (time) {
		const m = toMinutes(time);
		if (m == null) return null;
		h = Math.floor(m / 60);
		min = m % 60;
	}
	return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), h, min);
}
