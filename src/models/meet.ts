import User from "./user"

class Meet {
	id: string
	title: string
	body: string
	link?: string
	coords: [number, number]
	images: string[]
	// user_id: string
  
	constructor(title: string, body: string, coords: [number, number]) {
	  this.id = ''
	  this.title = title
	  this.body = body
	  this.coords = coords
	  this.images = []
	}
  }
  
  export default Meet