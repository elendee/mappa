import env from './.env.js'
import * as lib from './lib.js'
import log from './log.js'
import DB from './db.js'
import User from './models/User.js'





/*
	a very loose factory mapper
*/






const parser = async( uuid ) => {

	const pool = DB.getPool()
	let sql, res

	let parser

	if( uuid ){
		sql = `SELECT * FROM parsers WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )
	}else{
		return log('flag', 'unhandled parser')
	}

	if( res.error ) return log('flag', res.error )

	if( res.results?.length ){
		return new Parser( res.results[0] )
	}else{
		log('flag', 'no parser found', uuid )
	}

}



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

}












export {
	user,
	parser,
}