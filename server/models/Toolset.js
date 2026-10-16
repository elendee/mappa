import Model from './Model.js'
import log from '../log.js'
import PUBLIC from '../data/PUBLIC.js'




class Toolset extends Model { 
	static table='toolsets';
	static owner_test='user_key' 

	constructor(init){
		super( init )
		init = init || {}

		this.table = Toolset.table

		this.slug = init.slug || this.slug || this.name?.replace(/ /g, '_')

		// instantiated .. unclear if hydrated vs. published yet...
		this.tools = []

	}

}

export default Toolset