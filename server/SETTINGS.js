import DB from './db.js'
import log from './log.js'
import Model from './models/Model.js'


let settings = false


class Setting extends Model {

	constructor( init ){
		init = init || {}
		super( init)
		this.table = 'settings'
		this.setting = init.setting
		this.value = init.value
	}

	async save(){

		const update_fields = [
			'setting',
			'value',
		]

		const update_vals = [ 
			this.setting,
			this.value,
		]

		const res = await DB.update( this, update_fields, update_vals )

		return res

	}
	
}



const get = setting => {
	if( !settings ){
		log('flag', 'settings not yet initialized', setting )
		return
	}
	return settings[ setting ]
}

const set = async( setting, value ) => {
	/*
		upserts
	*/

	// set db
	const s = new Setting({
		setting,
		value,
	})

	let res = await s.save()
	if( !res?.affectedRows ){
		log('flag', 'new setting insert:', {
			id: res.id,
			setting,
			value,
		})
	}

	// set mem
	settings[ setting ] = value

}


const init = async() => {
	const pool = DB.getPool()
	const sql = 'SELECT * FROM settings WHERE 1'
	const res = await pool.queryPromise( sql )
	if( res.error ) throw new Error( res.error )
	settings = {}
	for( const result of res.results ){
		settings[ result.setting  ] = result.value
	}
}


export default {
	get,
	set,
	init
}