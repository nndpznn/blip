import { supabase } from "@/clients/supabaseClient"
import { Time, parseDate, CalendarDate } from "@internationalized/date";
import { encodeToGoogleMaps } from "@/util/encodeToGoogleMaps";

export interface LocationData {
    name: string;           // e.g., "Whole Foods" or "595 Redwood Highway"
    address: string;        // The full formatted address string
    mapbox_id: string | null; // Nullable for your migrated legacy records
    coordinates: [number, number]; // Strictly a tuple of [lng, lat]
    metadata?: {
        category?: string;
        is_poi: boolean;
    };
}

/** Max size per meet image (10 MiB). */
export const MEET_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export function isMeetImageOverLimit(file: File): boolean {
	return file.size > MEET_IMAGE_MAX_BYTES;
}

class Meet {
	// supabase generates a unique meet ID upon data entry, and can be retrieved later...
	organizerId: string 
	/** Matches `meets.id` in Supabase (integer or UUID string). */
	id: number | string
	title: string
	body: string
	link?: string
	location: LocationData
	mapsLink: string
	images: string[]
	date: CalendarDate | null
	startTime: Time | null
	endTime: Time | null
  
	constructor(organizerId: string, title: string, body: string, link: string, location: LocationData) {
	  this.organizerId = organizerId ? organizerId : "unknown"
	  this.id = 0
	  this.title = title
	  this.body = body
	  this.link = link
	  this.location = location
	  this.mapsLink = encodeToGoogleMaps(location.name, location.coordinates)
	  this.images = []
	  this.date = null
	  this.startTime = null
	  this.endTime = null
	}

	// DATE TIME STUFF
	
	// Takes our data and returns real date
	static getCalendarDateFrom(datetime: string): CalendarDate | null {
		if (!datetime) return null;
		try {
			return parseDate(datetime.split("T")[0]);
		} catch {
			return null;
		}
	}

	// Takes our data and returns just time string
	static getTimeStringFrom(datetime: string): string | null {
		if (!datetime || !datetime.includes("T")) return null;

		const timePart = datetime.split("T")[1]?.replace("Z", "") ?? ""; // "4:00:00"
		const [hour, minute] = timePart.split(":");

		if (!hour || !minute) return null;

		const paddedHour = hour.padStart(2, "0");
		return `${paddedHour}:${minute}`;
	}

	// END DATE TIME STUFF

	/**
	 * Uploads files in order. Returns one string per input file: public URL or "" if over limit / upload failed.
	 * Preserves length so edit flows can zip results with pending slots by index.
	 * @param assignToMeet When true (default), sets `this.images` to successful URLs only (order preserved). Set false when merging ordered slots (e.g. edit flow).
	 */
	async uploadImages(files: File[], options?: { assignToMeet?: boolean }): Promise<string[]> {
		const uploadedImageUrls: string[] = [];

		for (const file of files) {
		  if (isMeetImageOverLimit(file)) {
			console.error("Image exceeds max size:", file.name, file.size);
			uploadedImageUrls.push("");
			continue;
		  }

		  const fileExt = file.name.split('.').pop(); // Get file extension
		  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`; // unique per file (batch uploads can share ms)
		  const filePath = `meetImages/${this.organizerId}/${fileName}`;

		  const { data, error } = await supabase
			.storage
			.from('images')
			.upload(filePath, file);

		  if (error) {
			console.error("Error uploading image:", error);
			uploadedImageUrls.push("");
			continue;
		  }

		  const imageUrl = supabase
			.storage
			.from('images')
			.getPublicUrl(data?.path || '')
			.data.publicUrl;

		  uploadedImageUrls.push(imageUrl || "");
		}

		if (options?.assignToMeet !== false) {
			this.images = uploadedImageUrls.filter(Boolean);
		}
		return uploadedImageUrls;
	  }


	  /** Payload for `meets` — column names must match your Supabase table (this app uses camelCase, e.g. organizerId). */
	  private toMeetsRowPayload() {
		return {
			organizerId: this.organizerId,
			title: this.title,
			body: this.body,
			location: this.location,
			mapsLink: encodeToGoogleMaps(this.location.name, this.location.coordinates),
			links: this.link,
			images: this.images,
			date: this.date?.toString(),
			startTime: this.startTime?.toString(),
			endTime: this.endTime?.toString(),
		};
	  }

	  async saveToDatabase(): Promise<boolean> {
		const { data, error } = await supabase
		  .from('meets')
		  .insert([this.toMeetsRowPayload()])
		  .select("id");
	
		if (error) {
		  console.error("Error saving meet data:", error);
		  return false;
		}

		const row = data?.[0];
		if (!row) {
		  console.error("Error saving meet data: no row returned from insert.");
		  return false;
		}

		this.id = row.id;
		console.log("Meet data saved:", data);
		return true;
	  }

	  async saveEditDatabase(): Promise<boolean> {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) {
			console.error("Error saving meet data: not signed in (Supabase session missing).");
			return false;
		}

		const { data, error } = await supabase
		  .from('meets')
		  .update(this.toMeetsRowPayload())
		  .eq("id", this.id)
		  .select("id");

		if (error) {
		  console.error("Error saving meet data:", error);
		  return false;
		}

		const row = data?.[0];
		if (!row) {
		  console.error(
				"Error saving meet data: no rows updated (check id, RLS, or permissions).",
				{ meetId: this.id, idType: typeof this.id },
			);
		  return false;
		}

		this.id = row.id;
		console.log("Meet data edited:", data);
		return true;
	  }
  }
  
  export default Meet