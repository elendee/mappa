import log from '../log.js'
// import env from '../.env.js'
import lib from '../lib.js'
// import uuid from 'uuid'
import DB from '../db.js'
import Model from './Model.js'






class ConfirmCode extends Model {

	static table = 'confirm_codes'
	static owner_test = 'user_key'

	constructor( init ){

		super( init )
		init = init || {}
		this.table = ConfirmCode.table
		this.owner_test = ConfirmCode.owner_test
	}

}

  
export default ConfirmCode
