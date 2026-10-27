import type { LocationData } from "./location";

/**
 * A row of the `meets` table as the apps read it (only the columns they select).
 * Column names are camelCase in the database for the time/organizer fields.
 */
export interface MeetRecord {
	id: number | string;
	created_at?: string;
	title: string;
	body: string;
	images: string[] | null;
	date: string | null; // "YYYY-MM-DD"
	startTime: string | null; // "HH:MM:SS"
	endTime: string | null;
	organizerId: string;
	location: LocationData;
}
