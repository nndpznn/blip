import User from "./user"
import { supabase } from "@/clients/supabaseClient"

class Meet {
	// supabase generates a unique meet ID upon data entry, and can be retrieved later.
	organizer_id?: number
	title: string
	body: string
	coords: [number, number]
	link?: string
	images: string[]
  
	constructor(title: string, body: string, link: string, coords: [number, number]) {
	  this.title = title
	  this.body = body
	  this.link = link
	  this.coords = coords
	  this.images = []
	}

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
			}
		  ]);
	
		if (error) {
		  console.error("Error saving meet data:", error);
		  return;
		}
	
		console.log("Meet data saved:", data);
	  }
  }
  
  export default Meet