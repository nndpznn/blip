import { supabase } from "@/clients/supabaseClient"
import { CalendarDateTime, Time, parseDate, CalendarDate, toCalendarDate, fromDate } from "@internationalized/date";

interface LocationData {
    address: string;
    coordinates: number[]; // [lng, lat]
}

class Meet {
	// supabase generates a unique meet ID upon data entry, and can be retrieved later...
	organizerId: string 
	id: number
	title: string
	body: string
	link?: string
	location: LocationData;
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

		let timePart = datetime.split("T")[1]?.replace("Z", "") ?? ""; // "4:00:00"
		const [hour, minute] = timePart.split(":");

		if (!hour || !minute) return null;

		const paddedHour = hour.padStart(2, "0");
		return `${paddedHour}:${minute}`;
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
			  organizerId: this.organizerId,
			  title: this.title,
			  body: this.body,
			  location: this.location,
			  links: this.link,
			  images: this.images,
			  date: this.date?.toString(),
			  startTime: this.startTime?.toString(),
			  endTime: this.endTime?.toString(),
			}
		  ]).select("id");
	
		if (error) {
		  console.error("Error saving meet data:", error);
		  return;
		}
		
		this.id = data[0].id
		console.log("Meet data saved:", data);
	  }

	  async saveEditDatabase(): Promise<void> {
		const { data, error } = await supabase
		  .from('meets')
		  .update([
			{
			  organizerId: this.organizerId,
			  title: this.title,
			  body: this.body,
			  location: this.location,
			  links: this.link,
			//   images: this.images,
			  date: this.date?.toString(),
			  startTime: this.startTime?.toString(),
			  endTime: this.endTime?.toString(),
			}
		  ]).eq("id", this.id)
		  .select("id");
	
		if (error) {
		  console.error("Error saving meet data:", error);
		  return;
		}
		
		this.id = data[0].id
		console.log("Meet data edited:", data);
	  }
  }
  
  export default Meet