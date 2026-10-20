import env from './.env.js'
import * as lib from './lib.js'
import log from './log.js'
import DB from './db.js'
import User from './models/User.js'
import MapView from './models/MapView.js'
import Tool from './models/Tool.js'
import Toolset from './models/Toolset.js'
import MapElement from './models/MapElement.js'







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

} // user





const mapview = async( args ) => {
	const {
		id, 
		uuid,
	} = args

	const pool = DB.getPool()
	let sql, res

	let mapview

	if( id ){
		sql = `SELECT * FROM mapviews WHERE id=?`
		res = await pool.queryPromise( sql, id )
	}else if( uuid ){
		sql = `SELECT * FROM mapviews WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )
	}else{
		return log('flag', 'get-mapview: not found', {
			id,
			uuid,
		})
	}

	if( res.error ) return log('flag', 'err get mapview', res.error )

	if( res.results?.length ){
		return new MapView( res.results[0] )
	}else{
		log('flag', 'no mapview found', {
			uuid,
			id,
		})
	}

} // mapview






const tool = async( args ) => {
	const {
		id, 
		uuid,
	} = args

	const pool = DB.getPool()
	let sql, res

	let tool

	if( id ){
		sql = `SELECT * FROM tools WHERE id=?`
		res = await pool.queryPromise( sql, id )
	}else if( uuid ){
		sql = `SELECT * FROM tools WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )
	}else{
		return log('flag', 'get-tool: not found', {
			id,
			uuid,
		})
	}

	if( res.error ) return log('flag', 'err get tool', res.error )

	if( res.results?.length ){
		return new Tool( res.results[0] )
	}else{
		log('flag', 'no tool found', {
			uuid,
			id,
		})
	}

} // tool





const toolset = async( args ) => {
	const {
		id, 
		uuid,
		view_key,
	} = args

	const pool = DB.getPool()
	let sql, res

	let tool

	if( id ){
		sql = `SELECT * FROM toolsets WHERE id=?`
		res = await pool.queryPromise( sql, id )
	}else if( uuid ){
		sql = `SELECT * FROM toolsets WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )
	}else{
		return log('flag', 'get-toolsets: not found', {
			id,
			uuid,
		})
	}

	if( res.error ) return log('flag', 'err get toolset', res.error )

	if( res.results?.length ){
		const first = res.results[0]
		return new Toolset( first )
	}else{
		log('flag', 'no toolset found', {
			uuid,
			id,
			view_key
		})
	}

} // tool





const map_element = async( args ) => {
	const {
		id, 
		uuid,
	} = args

	const pool = DB.getPool()
	let sql, res

	let tool

	if( id ){
		sql = `SELECT * FROM map_elements WHERE id=?`
		res = await pool.queryPromise( sql, id )
	}else if( uuid ){
		sql = `SELECT * FROM map_elements WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )
	}else{
		return log('flag', 'get-map-element: not found', {
			id,
			uuid,
		})
	}

	if( res.error ) return log('flag', 'err get map-element', res.error )

	if( res.results?.length ){
		const first = res.results[0]
		return new MapElement( first )
	}else{
		log('flag', 'no map-element found', {
			uuid,
			id,
		})
	}

} // tool












export {
	tool,
	mapview,
	user,
	toolset,
	map_element,
}