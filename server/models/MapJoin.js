import Model from './Model.js'
import log from '../log.js'
import PUBLIC from '../data/PUBLIC.js'




class MapJoin extends Model { 

	static table='map_joins'; 
	static owner_test='user_key' 

	constructor(init){
		super( init )
		init = init || {}

		this.table = MapJoin.table

	}

}


export default MapJoin