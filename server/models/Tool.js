import Model from './Model.js'
import log from '../log.js'
import PUBLIC from '../data/PUBLIC.js'




class Tool extends Model { 
	static table='tools'; 
	static owner_test='user_key' 

	constructor(init){
		super( init )
		init = init || {}

		this.table = Tool.table

		this.slug = init.slug || this.slug || this.name?.replace(/ /g, '_')

	}

}

export default Tool