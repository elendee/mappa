import Model from './Model.js'
import DB from '../db.js'
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

	async get_tools(){

		const pool = DB.getPool()
		let sql, res

		sql = `SELECT * FROM tools WHERE set_key=?`
		res = await pool.queryPromise( sql, this.id )
		if( res.error ) return log('flag', 'err-get-tools', res.error)

		return res.results

	}

}

export default Toolset