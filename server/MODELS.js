import env from './.env.js'
import DB from './db.js'
import lib from './lib.js'
import log from './log.js'
import {
	Classes,
} from './models/ModelClasses.js'
import FIELDS from './data/FIELDS.js'
import BROKER from './BROKER.js'









const UUID_KEYS = Object.keys( FIELDS.PERSISTS_UUID )




const create = async( request ) => {
	const {
		type,
		model,
		args,
		pre_data,
	} = request.body

	const user = request.session?.USER

	log('Model', 'create: ', request.body )

	try{

		/* validate */
		if( !model ) return lib.return_fail(`missing Model create data: ${type}`, `invalid model data`)

		/* get class */
		const c = Classes[ type ]
		if( !c ) return lib.return_fail(`no class for Model create: ${type}`, `unable to create`)

		/* fill uuid */
		if( UUID_KEYS.includes( type ) && !model.uuid ){
			const custom_uuid = c.custom_uuid // ( mem_uuuid etc )
			const length = FIELDS.PERSISTS_UUID[ type ]
			model.uuid = await lib.get_unique_uuid( DB, c.table, length, custom_uuid )
		}else{
			// 
		}

		/* fill ownership key(s) */
		if( c.owner_test ){
			model[ c.owner_test ] = user.id
		}

		/* make */
		const new_model = new c( model )

		if( pre_data && new_model._handle_pre_save ){
			await new_model._handle_pre_save( request, pre_data, Classes, true )
		}

		/* save */
		let res = await new_model.save()
		new_model.id = res.id
		new_model.created = res.created

		if( type === 'Bot' ){
			BROKER.publish('BOT_NEW', {
				bot: new_model,
			})
		}

		return {
			success: true,
			full_model: new_model,
			model: new_model.publish( new_model.get_request_allowed( request))
		}

	}catch( err ){
		return lib.return_fail( err, `error creating model`)
	}

} /// create




const update = async( request ) => {

	const {
		model,
		type,
		args,
		pre_data
	} = request.body

	const pool = DB.getPool()
	let sql, res, value

	try{

		log('Model', 'update: ', request.body )

		switch( type ){
		// case 'Bot':
		// 	BROKER.publish('BOT_HYDRATE', {
		// 		data: model,
		// 		uuid: model.uuid,
		// 		skip_refresh: false,
		// 	})
		// 	return {
		// 		success: true,
		// 	}

		// case 'Text':
		// 	return lib.return_fail(`unhandled cache-update model: ${type}`, `unhandled update type`)

		// case 'Group':
		// 	value = await GROUPS.touch_group( model.uuid )
		// 	value.hydrate( model )
		// 	res = await value.save()
		// 	return {
		// 		success: res?.success,
		// 	}

		default:
			const MC = Classes[type]
			if( !MC ) return lib.return_fail('invalid type', 'invalid type')
			if( UUID_KEYS.includes( type )){
				if( !model.uuid ) return lib.return_fail(`model missing uuid for update: ${type}`, `invalid update`)
				sql = `SELECT * FROM ${MC.table} WHERE uuid=?`
				res = await pool.queryPromise( sql, model.uuid )
				if( res.error ) return lib.return_fail( res.error, `error updating model`)
				if( !res.results?.length ) return lib.return_fail('no model found to update', `no model found to update`)
				value = new MC( res.results[0] )
				value.hydrate( model )

				if( pre_data && value._handle_pre_save ){
					await value._handle_pre_save( request, pre_data, Classes, false )
				}

				res = await value.save()

				const pub = value.publish( value.get_request_allowed( request ) )

				return {
					success: res?.success,
					model: pub,
					full_model: value,
				}

			}else{
				return lib.return_fail(`unhandled custom update type: ${type}`, 'unhandled custom update')
			}
			// break;
		}

		return lib.return_fail(`unhandled Model update: ${model?.type}`, `unhandled update`)

	}catch( err ){
		return lib.return_fail( err, `error updating model`)
	}

} // update






const remove = async( data ) => {

	try{

		log('Model', 'remove: ', data )

		const {
			request
		} = data
		const {
			body,
		} = request
		const {
			uuid,
			model,
		} = body

		const _model = Classes[ model ]
		if( !_model ) return lib.return_fail(`model not found`, `error removing`)

		const value = await _model.get_instance({
			column: 'uuid',
			value: uuid,
		})

		if( !value ) return lib.return_fail(`not found`, `not found`)
		await value.unset()

		// const pool = DB.getPool()
		// let sql, res
		// sql = ``

		return lib.return_fail(`unhandled Model remove: ${data?.type}`, `unhandled remove`)

	}catch( err ){
		return lib.return_fail( err, `error removing model`)
	}

}









const post_create = async( args ) => {
	const {
		pool,
		request,
		full_model,
		pre_res,
	} = args

	try{

		const user = request.session.USER

		let sql, res, value, room

		switch( request.body?.type ){

		case 'Item':

			full_model.esta_key = pre_res.esta_key

			await full_model.save()

			break;

		case 'QRcode':

			// allow it to run fully async:
			BROKER.publish('MAKE_QR', {
				request,
				qr: full_model,
			})

			break;


		default:
			break;
		}

		BROKER.publish('MODEL_CREATED', {
			model: full_model,
			uuid: full_model.uuid,
			place_uuid: pre_res.place_uuid,
		})

	}catch( err ){

		return lib.return_fail( err, `error processing save`)

	}

	return {
		success: true,
	}	

} // post create



const pre_create = async( args ) => {
	const {
		request,
		pool,
	} = args
	/*
		matches request syntax
	*/

	try{

		let sql, res, value, room, place

		const user = request.session.USER

		const {
			model,
		} = request.body

		for( const key in model ){
			if( key.match(/_key/) ){
				log('flag', 'key passed from client', {
					key,
					model,
				})
				return lib.return_fail(`key passed from client`, `invalid create data`)
			}
		}

		switch( request.body?.type ){

		case 'Item':

			value = request.body.pre_data?.place_uuid
			if( !value ) return lib.return_fail(`no place uuid provided for Item create`, `invalid Place provided`)

			place = await get_place({
				uuid: value,
				deep: true,
			})
			if( !place ) return lib.return_fail(`place not found: ${value}`, `place not found`)

			return {
				success: true,
				place_uuid: value,
				esta_key: place.id,
			}

		case 'QRcode':

			place = await get_place({
				uuid: request.body.pre_data?.place_uuid,
				deep: true,
			})
			if( !place ) return lib.return_fail(`place not found: ${request.body.pre_data?.place_uuid}`, `place not found`)

			if( !place.can_edit( request, null, null, user.session_id ) ){
				return lib.return_fail(`invalid permissions`, `invalid permissions`)
			}

			model.place_key = place.id

			// await model.save()

			return {
				success: true,
			}

		case 'Establishment':

			model.owner_session_id = request.session.id

			return {
				success: true,
			}


		// 	if( !lib.is_logged( request ) ) return lib.return_fail(`unlogged create-room`, `must be logged in`)

		// 	// check dupes
		// 	value = model?.name
		// 	if( !value || typeof value !== 'string' ) return lib.return_fail(`invalid room name`, `invalid name`)
		// 	sql= `SELECT * FROM rooms WHERE name LIKE ?`
		// 	res = await pool.queryPromise( sql, value )
		// 	if( res.error ) return lib.return_fail( res.error, `error returning`)
		// 	if( res.results?.length ) return lib.return_fail(`room dupe`, `"${value}" already exists!`)

		// 	// one room per user
		// 	sql = `SELECT * FROM rooms WHERE ${Room.owner_test}=?`
		// 	res = await pool.queryPromise( sql, user.id )
		// 	if( res.error ) return lib.return_fail( res.error, `error check owner`)
		// 	if( res.results?.length >= PUBLIC.LIMITS.ROOM.PER_USER && !lib.is_admin( request ) ){
		// 		return lib.return_fail(`user at room limit`, `max ${PUBLIC.LIMITS.ROOM.PER_USER} rooms per user`)
		// 	}
		// 	break;

		default:
			break;
		}

		return {
			success: true,
		}

	}catch( err ){
		return lib.return_fail( err, `failed to create`)
	}

} // pre create





const pre_update = async( args ) => {
	const {
		request,
		pool,
	} = args
	/*
		matches request syntax
	*/

	try{

		let sql, res, value, place

		const user = request.session.USER

		const {
			model,
		} = request.body

		for( const key in model ){
			if( key.match(/_key/)){
				log('flag', 'key passed from client', {
					key,
					model,
				})
				return lib.return_fail(`key passed from client`, `invalid create data`)
			}
		}

		switch( request.body?.type ){

		case 'Establishment':
		case 'Item':

			value = request.body.pre_data?.place_uuid
			if( !value ) return lib.return_fail(`no place uuid provided for Item update`, `invalid Place provided`)

			place = await get_place({
				uuid: value,
				deep: true,
			})
			if( !place ) return lib.return_fail(`place not found: ${value}`, `place not found`)

			return {
				success: true,
				place_uuid: value,
				esta_key: place.id,
			}

		default:
			//
			break;
		}

		return {
			success: true,
		}

	}catch( err ){
		return lib.return_fail( err, `failed to create`)
	}

} // pre update


const post_update = async( args ) => {
	const {
		pool,
		request,
		full_model,
		pre_res,
	} = args

	try{

		const user = request.session.USER

		let sql, res, value, room

		switch( request.body?.type ){

		// // case 'Room':
		// case 'Post':
		// 	room = await get_r oom( request.body.pre_data.room_name )
		// 	if( !room ) return lib.return_fail(`invalid room: ${request.body.pre_data.room_name }`, `failed to find room`)

		// 	update_post_counts({
		// 		room,
		// 		request,
		// 		pool,
		// 		model: full_model,
		// 	})

		// 	break;

		default:
			break;
		}

		BROKER.publish('MODEL_UPDATED', {
			model: full_model,
			uuid: full_model.uuid,
			place_uuid: pre_res.place_uuid,
		})

	}catch( err ){

		return lib.return_fail( err, `error processing save`)

	}

	return {
		success: true,
	}	

} // post update



const get_place = async( args ) => {
	const {
		uuid,
		deep,
	} = args || {}

	if( deep ){

		const pool = DB.getPool()
		let sql, res
		sql = `SELECT * FROM establishments WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )

		if( res.error ) return log('flag', 'error getting place', res.error )

		if( !res.results?.[0] ) return log('flag', 'no place found')

		const place = new Classes.Establishment( res.results[0] )

		return place
	}else{

		log('flag', 'unhandled deep get-place')

	}

}










export default {
	// action,
	create,
	update,
	remove,
	pre_create,
	post_create,
	pre_update,
	post_update,
}