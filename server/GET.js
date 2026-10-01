import env from './.env.js'
import * as lib from './lib.js'
import log from './log.js'
import DB from './db.js'
import User from './models/User.js'
import Layer from './models/Layer.js'







const user = async( args ) => {
	const {
		slug, 
		id, 
		email
	} = args

	const pool = DB.getPool()
	let sql, res

	let parser

	if( slug ){
		sql = `SELECT * FROM users WHERE slug=?`
		res = await pool.queryPromise( sql, slug )
	}else if( id ){
		sql = `SELECT * FROM users WHERE id=?`
		res = await pool.queryPromise( sql, id )
	}else if( email ){
		sql = `SELECT * FROM users WHERE email=?`
		res = await pool.queryPromise( sql, email )
	}else{
		// if( env.LOCAL ){
		// 	log('flag', 'local throw....')
		// 	throw new Error('invalid user query', args )
		// }
		return log('flag', 'get-user: not found', {
			slug,
			id,
			email
		})
	}

	if( res.error ) return log('flag', res.error )

	if( res.results?.length ){
		return new User( res.results[0] )
	}else{
		log('flag', 'no user found', {
			slug,
			email,
			id,
		})
	}

} // layer





const layer = async( args ) => {
	const {
		id, 
		uuid,
	} = args

	const pool = DB.getPool()
	let sql, res

	let layer

	if( id ){
		sql = `SELECT * FROM layers WHERE id=?`
		res = await pool.queryPromise( sql, id )
	}else if( uuid ){
		sql = `SELECT * FROM layers WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )
	}else{
		return log('flag', 'get-layer: not found', {
			id,
			uuid,
		})
	}

	if( res.error ) return log('flag', 'err get layer', res.error )

	if( res.results?.length ){
		return new Layer( res.results[0] )
	}else{
		log('flag', 'no layer found', {
			uuid,
			id,
		})
	}

} // layer






const tool = async( args ) => {
	// const {
	// 	id, 
	// 	uuid,
	// } = args

	// const pool = DB.getPool()
	// let sql, res

	// let tool

	// if( id ){
	// 	sql = `SELECT * FROM tools WHERE id=?`
	// 	res = await pool.queryPromise( sql, id )
	// }else if( uuid ){
	// 	sql = `SELECT * FROM tools WHERE uuid=?`
	// 	res = await pool.queryPromise( sql, uuid )
	// }else{
	// 	return log('flag', 'get-tool: not found', {
	// 		id,
	// 		uuid,
	// 	})
	// }

	// if( res.error ) return log('flag', 'err get tool', res.error )

	// if( res.results?.length ){
	// 	return new Tool( res.results[0] )
	// }else{
	// 	log('flag', 'no tool found', {
	// 		uuid,
	// 		id,
	// 	})
	// }

	log('flag', 'UNHANDLED GET-TOOL')

} // tool













export {
	tool,
	layer,
	user,
}