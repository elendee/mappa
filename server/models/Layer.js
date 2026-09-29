import Model from './Model.js'



class Layer extends Model { 
	static table='layers'; 
	static owner_test='user_key' 
	constructor(init){
		super( init )
		init = init || {}

		this.table = Layer.table

	}



}



export default Layer