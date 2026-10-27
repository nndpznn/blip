import type { LocationData } from "./location";

/** Meets that share a place (to 5 decimals, about 1 m) share one map pin. */
export function locationKey(coordinates: [number, number]): string {
	const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
	return `${round5(coordinates[0])},${round5(coordinates[1])}`;
}

interface HasLocation {
	id: number | string;
	location: Pick<LocationData, "coordinates">;
}

function hasValidCoordinates(meet: HasLocation): boolean {
	const c = meet.location?.coordinates;
	return Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]);
}

/** Groups meets by place, preserving order within each group. Meets without usable coordinates are dropped. */
export function groupMeetsByLocation<T extends HasLocation>(meets: T[]): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const meet of meets) {
		if (!hasValidCoordinates(meet)) continue;
		const key = locationKey(meet.location.coordinates);
		const group = groups.get(key);
		if (group) group.push(meet);
		else groups.set(key, [meet]);
	}
	return groups;
}

export interface MeetPointFeature {
	type: "Feature";
	geometry: { type: "Point"; coordinates: [number, number] };
	properties: { id: string; key: string };
}

export interface MeetFeatureCollection {
	type: "FeatureCollection";
	features: MeetPointFeature[];
}

/** One point per meet (the map clusters them). `id` is a string so UUID and numeric ids behave the same. */
export function meetsToFeatureCollection<T extends HasLocation>(meets: T[]): MeetFeatureCollection {
	return {
		type: "FeatureCollection",
		features: meets.filter(hasValidCoordinates).map((meet) => ({
			type: "Feature" as const,
			geometry: { type: "Point" as const, coordinates: meet.location.coordinates },
			properties: { id: String(meet.id), key: locationKey(meet.location.coordinates) },
		})),
	};
}
