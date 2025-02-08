import User from "./user"

class Meet {
	id: string
	title: string
	body: string
	link?: string
	images: string[]
	// user_id: string
  
	constructor(title: string, body: string) {
	  this.id = ''
	  this.title = title
	  this.body = body
	  this.images = []
	}
  }
  
  export default Meet