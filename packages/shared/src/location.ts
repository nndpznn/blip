/** A meet's place, as stored in `meets.location` (jsonb). */
export interface LocationData {
	name: string; // e.g., "Whole Foods" or "595 Redwood Highway"
	address: string; // The full formatted address string
	mapbox_id: string | null; // Legacy (Mapbox-era) records only; new places store null
	coordinates: [number, number]; // Strictly a tuple of [lng, lat]
	metadata?: {
		category?: string;
		is_poi: boolean;
	};
}
