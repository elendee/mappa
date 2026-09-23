import fs from 'fs'
import env from '../.env.js'
// import * as CSV from 'csv-parse'
import log from '../log.js'
import DB from '../db.js'
import lib from '../lib.js'
import bcrypt from 'bcryptjs'
// import SOCKETS from '../SOCKETS.js'
import Model from './Model.js'
import PRIVATE from '../data/PRIVATE.js'
import PUBLIC from '../data/PUBLIC.js'
import FIELDS from '../data/FIELDS.js'
import SVGS from '../data/SVGS.js'







class User extends Model {

	static table = 'users'

	constructor( init ){

		super( init )

		init = init || {}

		this.uuid = init.uuid || lib.random_hex( FIELDS.PERSISTS_UUID.User )

		this.table = User.table

		this.handle = init.handle || `anon_${this.uuid?.substr(0,4)}`

		// instantiated
		this.session_id = lib.validate_string( init.session_id, init.session_id, undefined )


	}



	output_summary(){
		const summary = {
			uuid: this.uuid,
			// slug: this.slug,
			handle: this.handle,
		}
		return summary
	}



	async set_field( data, persist ){
		/*
			safely update a field given from client
			optionally save to database as well
		*/

		return lib.return_fail(`deprecated set-field`, `fail to set`)

		// return {
		// 	success: true,
		// }
	}


} // User

























const SALT_ROUNDS = 10


const SAVE_MAP = {

	fields: {
		password: 'password',
		handle: 'handle',
		email: 'email',
		// slug: 'slug',
		// color:  'color',		
	},

	validations: {

		handle: value => {
			if( typeof value !== 'string' ) return false;
			const _val = value.trim()
			if( _val.length > 128 || _val.length < 2 ) return false;
			return true
		},

		password: ( value ) => {

			if( typeof value !== 'string' ) return false;
			const _val = value.trim()
			if( _val.length < 6 ) return false;
			if( _val.length > 128 ) return false;

			return true;

		}

	},

	filters: {

		password: ( value, user ) => {
			let salt = bcrypt.genSaltSync( SALT_ROUNDS )
			let hash = bcrypt.hashSync( value, salt )
			return hash
		},

		handle: ( value, user ) => {

			if( typeof value !== 'string' ){
				log('flag', 'invalid handle save: ', lib.identify( user ), typeof value )
				return 'u_' + lib.random_hex(12)
			}

			return lib.user_data( value, {
				strip_html: true,
			}).replace(/ /g, '').substr(0, 100)

		},

	},

	callbacks: {

		// email: ( value, user ) => {
		// 	user.email = value // set for session
		// }

	}

}







  
export default User