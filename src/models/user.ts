import { supabase } from "@/clients/supabaseClient"
import { profile } from "console"

class User {
	id: string
	fullname: string
	username: string
	email: string
	headline: string
	bio: string
	link: string
	
	// customization
	profile_color: string
  
	constructor(id: string, fullname: string, username: string, email: string, headline: string, bio: string, link: string, profile_color:string) {
	  this.id = id
	  this.fullname = fullname
	  this.username = username
	  this.email = email
	  this.headline = headline
	  this.bio = bio
	  this.link = link
	  this.profile_color = profile_color
	}

	async saveProfile(): Promise<any|null> {
		const { data, error } = await supabase
		  .from('profiles')
		  .update([
			{
				fullname: this.fullname,
				username: this.username,
				headline: this.headline,
				bio: this.bio,
				link: this.link,
				profile_color: this.profile_color
			}
		  ]).eq("id", this.id)
		  .select("*");
	
		if (error) {
		  console.error("Error saving profile data:", error);
		  return;
		}
		
		console.log("Profile data edited:", data);
		return data[0]
	  }
  }
  
  export default User