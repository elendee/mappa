/*
	Friendship
*/
import env from '../.env.js'
import DB from '../db.js'
import lib from '../lib.js'
import log from '../log.js'
import Model from './Model.js'
import FIELDS from '../data/FIELDS.js'




class Friendship extends Model {

	static table = 'friends'
	// static owner_test = 'user_key'

	constructor( init ){
		super( init )
		init = init || {}
		this.table = Friendship.table
		// this.owner_test = Friendship.owner_test

	}

	static async get_pair( args ){
		const {
			user_key1,
			user_key2,
		} = args


		const pool = DB.getPool()
		let sql, res

		sql = `SELECT * FROM friends WHERE 
		( user_key2=? AND user_key1=? ) 
		OR 
		( user_key2=? AND user_key1=? )`
		res = await pool.queryPromise( sql, [ 
			user_key1, 
			user_key2, 
			user_key2, 
			user_key1 
		])
		if( res.error ) return log('flag', res.error, `error getting pair`)
		if( res.results?.length	> 1 ){
			log('flag', 'too many results for pair')
		}
		if( res.results?.length ) return new this( res.results[0] )

	}

}



export default Friendship