import User from "./user"
import { supabase } from "@/clients/supabaseClient"
import { parseDate, CalendarDate } from "@internationalized/date";

class Meet {
	// supabase generates a unique meet ID upon data entry, and can be retrieved later...
	organizer_id?: number
	id: number
	title: string
	body: string
	link?: string
	coords: [number, number]
	images: string[]
	startDateTime: string
	endDateTime: string
  
	constructor(title: string, body: string, link: string, coords: [number, number]) {
	  this.id = 0
	  this.title = title
	  this.body = body
	  this.link = link
	  this.coords = coords
	  this.images = []
	  this.startDateTime = ""
	  this.endDateTime = ""
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
		if (!datetime.includes("T")) return null;

		let timePart = datetime.split("T")[1]?.replace("Z", "") ?? ""; // "4:00:00"
		const [hour, minute] = timePart.split(":");

		if (!hour || !minute) return null;

		const paddedHour = hour.padStart(2, "0");
		return `${paddedHour}:${minute}`;
	}

	// Combines date and time into datetime string
	static setDatetimeParts(date: CalendarDate, time: string): string {
		return `${date.toString()}T${time}:00Z`;
	}

	// Get/Set starting calendar date
	get date(): CalendarDate | null {
		return Meet.getCalendarDateFrom(this.startDateTime);
	}
	set date(val: CalendarDate | null) {
		if (!val) return;
		const time = this.startTimeString ?? "00:00";
		this.startDateTime = Meet.setDatetimeParts(val, time);
	}

	// Get/Set starting time
	get startTimeString(): string | null {
		return Meet.getTimeStringFrom(this.startDateTime);
	}
	set startTimeString(val: string | null) {
		if (!val) return;
		const date = this.date;
		if (date) this.startDateTime = Meet.setDatetimeParts(date, val);
	}

	// Get/Set ending time
	get endTimeString(): string | null {
		return Meet.getTimeStringFrom(this.endDateTime);
	}
	set endTimeString(val: string | null) {
		if (!val) return;
		const date = this.date;
		if (date) this.endDateTime = Meet.setDatetimeParts(date, val);
	}

	// END DATE TIME STUFF

	async uploadImages(files: File[]): Promise<void> {
		const uploadedImageUrls: string[] = [];
	
		for (const file of files) {
		  const fileExt = file.name.split('.').pop(); // Get file extension
		  const fileName = `${Date.now()}.${fileExt}`; // Create a unique filename
	
		  // Upload the image to Supabase Storage
		  const { data, error } = await supabase
			.storage
			.from('images') // Use your bucket name
			.upload(fileName, file);
	
		  if (error) {
			console.error("Error uploading image:", error);
			continue;
		  }
	
		  // Get the public URL of the uploaded image
		  const imageUrl = supabase
			.storage
			.from('images')
			.getPublicUrl(data?.path || '')
			.data.publicUrl;
	
		  if (imageUrl) {
			uploadedImageUrls.push(imageUrl);
		  }
		}
	
		this.images = uploadedImageUrls; // Save the URLs to the images array
	  }


	  async saveToDatabase(): Promise<void> {
		const { data, error } = await supabase
		  .from('meets')
		  .insert([
			{
			  organizer_id: 0,
			  title: this.title,
			  body: this.body,
			  location: this.coords,
			  links: this.link,
			  images: this.images,
			  startDateTime: this.startDateTime,
			  endDateTime: this.endDateTime
			}
		  ]).select("id");
	
		if (error) {
		  console.error("Error saving meet data:", error);
		  return;
		}
		
		this.id = data[0].id
		console.log("Meet data saved:", data);
	  }
  }
  
  export default Meet