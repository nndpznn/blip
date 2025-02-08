class User {
	id: string
	name: string
	email: string

	// location: Coordinates (later)
  
	constructor(name: string, email: string) {
	  this.id = ''
	  this.name = name
	  this.email = email
	  // this.author_id = ''
	  // this.user_id = ''
	}
  }
  
  export default User