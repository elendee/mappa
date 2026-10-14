import Model from './Model.js'



class MapElement extends Model { 

	static table = 'map_elements' 

	constructor( init ){
		super( init )
		init = init || {}
		this.table = MapElement.table
	}

}


export default MapElement
