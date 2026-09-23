import Model from './Model.js'

class Visit extends Model {

	static table = 'last_visitors'

	constructor( init ){
		super( init )
		init = init || {}
		this.type = 'visit'
		this.table = Visit.table
	}
}

export default Visit