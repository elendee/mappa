import lib from '../lib.js'
import Model from "./Model.js";
import DB from '../db.js'


class Notification extends Model {

	static table = 'notifications'

	constructor( init ){

		init = init || {}

		super( init )

		this.table = Notification.table

	}

}


export default Notification