import Model from './Model.js'


class Layer extends Model {
	constructor( init ){
		super( init )
		init = init || {}

		this.name = init.name || ''

	}
}


export default Layer