import env from './.env.js'
import lib from './lib.js'
import log from './log.js'
import DB from './db.js'
import PUBLIC from './data/PUBLIC.js'
import PRIVATE from './data/PRIVATE.js'
import SOCKETS from './SOCKETS.js'
import {
	Classes,
} from './models/ModelClasses.js'
import User from './models/User.js'
import MODELS from './MODELS.js'
import MediaItem from './models/MediaItem.js'
// import Alcove from './models/Alcove.js'
// import CoveJoin from './models/CoveJoin.js'
import Friendship from './models/Friendship.js'
// import ChatTranslate from './models/ChatTranslate.js'
// import Chat from './models/Chat.js'
import FIELDS from './data/FIELDS.js'
import BROKER from './BROKER.js'
import SVGS from './data/SVGS.js'
import sockets from './SOCKETS.js'
import * as GET from './GET.js'







const mutex_states = ['ready', 'working', 'canceled']



const action = async( request ) => {

	const { 
		action 
	} = request.body

	const user = request.session?.USER

	const pool = DB.getPool()
	let sql, res, pre_res, post_res 

	let value, model, account, err_msg, pub, place, uuid, order, line_item, item, can_edit, req_user, allowed

	const results = []
	const results_obj = {}

	const response = {
		success: false,
	}

	switch( action ){

	case 'poll_translation':

		value = await Chat.get_instance({
			column: 'uuid',
			value: request.body.chat_uuid,
		})
		if( !value ) return lib.return_fail(`chat not found for translate`, `chat not found`)

		const _done_trans = await ChatTranslate.get_translation({
			chat_key: value.id,
			language: request.body.language,
		})
		if( _done_trans ){
			return {
				success: true,
				translation: _done_trans.publish( _done_trans.get_view_allowed(0,0,0) )
			}
		}

		return {
			success: false,
		}

	case 'translate_text':
		if( !lib.is_logged( request )) return lib.return_fail(`must be logged in`, `must be logged in`)

		value = await Chat.get_instance({
			column: 'uuid',
			value: request.body.chat_uuid,
		})
		if( !value ) return lib.return_fail(`chat not found for translate`, `chat not found`)

		if( value.value?.length > PUBLIC.LIMITS.CHAT.TRANSLATE_CHARS ){
			return lib.return_fail(`block too long translate`, `translations limited to ${PUBLIC.LIMITS.CHAT.TRANSLATE_CHARS} for now`)
		}

		if( env.SPOOF?.TRANSLATE ){
			return {
				success: true,
				translation: {
					content: `Spoofslated to ${request.body.language}!`,
				},
				in_progress: false,
				query_uuid: lib.random_hex(8),
			}
		}

		if( !request.body.language?.trim() ){
			return lib.return_fail(`no translation made`, `no translation made`)
		}

		res = await ChatTranslate.init_translation({
			Chat,
			chat_key: value.id,
			user_key: user?.id,
			language: request.body.language,
		})

		return res




	case 'add_friend':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged`, `must be logged`)

		// requested friend
		req_user = await User.get_instance({
			column: 'uuid',
			value: request.body.user_uuid,
		})
		if( !req_user ) return lib.return_fail(`user not found`, `user not found`)

		// block dupes
		value = await Friendship.get_pair({
			user_key1: user.id,
			user_key2: req_user.id,
		})
		if( value ) return lib.return_fail(`already exists`, `already exists`)

		// init / invite
		value = new Friendship({
			user_key1: user.id,
			user_key2: req_user.id,
			accept1: true,
			accept2: false,
		})
		await value.save()

		return {
			success: true,
		}


	case 'get_friendlist':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged`, `must be logged`)
		sql = {
			sql: `
			SELECT u.*, f.* FROM friends f
			INNER JOIN users u ON f.user_key2 = u.id WHERE f.user_key1 = ?
			UNION
			SELECT u.*, f.* FROM friends f
			INNER JOIN users u ON f.user_key1 = u.id WHERE f.user_key2 = ?`,
			// nestTables: true, // not with UNION (!)
		}
		res = await pool.queryPromise( sql, [ 
			user.id,
			user.id,
			user.id,
			user.id,
		])
		if( res.error ) return lib.return_fail({
			err: res.error,
			value_id: value,
		}, `err get cove userlist`)

		// log('flag', 'FRIENDLIST', res.results )

		allowed = new User().get_view_allowed(0,0,0)

		for( const r of res.results ){

			let other_user = {}
			if( user.id === r.user_key2 ){
				other_user.value = r.user_key1
				other_user.int = '1'
				other_user.accept_key = r.accept1
			}else{
				other_user.value = r.user_key2
				other_user.int = '2' 
				other_user.accept_key = r.accept2
			}

			const _user = new User( r )
			const pub = _user.publish( allowed )

			// -- array to hold the 2 uuids of users, indicating who has accepted

			pub.friends_accepted = []

			if( r.accept1 ){
				const ua1 = await User.get_instance({
					column: 'id',
					value: r.user_key1
				})
				if( ua1 ) pub.friends_accepted.push( ua1.uuid )
			}

			if( r.accept2 ){
				const ua2 = await User.get_instance({
					column: 'id',
					value: r.user_key2
				})
				if( ua2 ) pub.friends_accepted.push( ua2.uuid )
			}

			// -- add notification count
			sql = `SELECT * FROM notifications n WHERE user_key=? AND sender_key=?`
			res = await pool.queryPromise( sql, [ user.id, _user.id ])
			if( res.error ){
				log('flag', 'notify err', res.error )
			}else{
				pub.notify_count = res.results?.length || 0
			}

			results.push( pub )

		}

		return {
			success: true,
			results,
		}


	case 'accept_friend':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged`, `must be logged`)

		req_user = await User.get_instance({
			column: 'uuid',
			value: request.body.user_uuid,
		})
		if( !req_user ) return lib.return_fail(`user not found`, `user not found`)

		if( !request.body.state ) return lib.return_fail(`unfriend not yet handled`,
			`unfriend not yet handled`)

		sql = `
		SELECT * FROM friends WHERE ( user_key1=? AND user_key2=? ) 
		OR ( user_key1=? AND user_key2=? )`
		res = await pool.queryPromise( sql, [ user.id, req_user.id, req_user.id, user.id ] )
		if( res.error ) return lib.return_fail( res.error, `error accepting`)
		if( res.results?.length !== 1 ){
			return lib.return_fail({
				msg: `invalid / missing frienship: ${res.results?.length}`,
				length: res.results?.length,
			}, `could not find relation`)
		}

		let accept_key
		const data = res.results[0]
		if( data.user_key1 === user.id ){
			accept_key = 'accept1'
		}else if( data.user_key2 === user.id ){
			accept_key = 'accept2'
		}else{
			return lib.return_fail(`invalid accept key for relation`, `invalid match found`)
		}

		sql = `UPDATE friends SET ${accept_key}=? WHERE id=?`
		res = await pool.queryPromise( sql, [ Date.now(), data.id ])
		if( res.error ) return lib.return_fail( res.error, `error saving frienship`)
		if( res.results?.affectedRows !== 1 ){
			return lib.return_fail({
				rows: res.results?.affectedRows,
				msg: 'failed to update Friendship'
			}, `error saving frienship`)
		}

		return {
			success: true,
		}


	case 'get_chat':

		value = await GET.chat({
			uuid: request.body.uuid,
		})
		if( !value ) return lib.return_fail(`get-chat not found: ${request.body.uuid}`, `not found`)

		return {
			success: true,
			value: value.publish( value.get_view_allowed(0,0,0) )
		}



	case 'get_svgs':

		return {
			success: true,
			svgs: SVGS,
		}

	case 'get_svg':
		if( !request.body.key ) return lib.return_fail('invalid svg get', 'invalid svg get')
		let svg

		if( request.body.subkey || request.body.subkey === '' ){ // (allow forced attempt & fail condition)
			svg = SVGS[ request.body.key ][ request.body.subkey ]
		}else{
			svg = SVGS[ request.body.key ]
		}
		return {
			success: !!svg,
			svg,
		}


	case 'remove_media_item':
		item = await get_media_item( request.body.slug )
		if( !item ) return lib.return_fail(`item not found for delete ${request.body.slug}`, `item not found`)
		if( !lib.is_admin( request ) && item.user_key !== user.id ){
			return lib.return_fail(`invalid permit to delete: ${request.body.slug}`, `you do not have permission to delete`)
		}

		if( item._custom_unset ){
			await item._custom_unset({})
		}

		await item.unset()
		return {
			success: true,
		}


	case 'create_model':

		// pre
		pre_res = await MODELS.pre_create({
			pool,
			request,
		})
		if( !pre_res?.success ) return pre_res

		// save
		res = await MODELS.create( request )
		if( !res?.success ) return res

		// post
		post_res = await MODELS.post_create({
			pool,
			request,
			full_model: res.full_model,
			pre_res,
		})
		if( !post_res?.success ) return post_res

		// sanitize...
		delete res.full_model 

		// done
		return res


	case 'update_model':

		// pre
		pre_res = await MODELS.pre_update({
			pool,
			request,
		})
		if( !pre_res?.success ) return pre_res

		res = await MODELS.update( request )
		if( !res?.success ) return res

		// post
		post_res = await MODELS.post_update({
			pool,
			request,
			full_model: res.full_model,
			pre_res,
			place_uuid: pre_res.place_uuid
		})
		if( !post_res?.success ) return post_res

		BROKER.publish('UPDATE_MODEL', {
			request,
			model: res.full_model,
			caller: 'ops-main-update',
		})

		// sanitize...
		delete res.full_model 

		// done
		return res

	case 'delete_model':
		res = await MODELS.remove({
			request,
		})//.model, request.body.args )
		// res = await MODELS.remove( request.body.model, request.body.args )
		return res

	case 'model_toggle_viz':
		type = request.body.type // (model)
		value = request.body.desired_state
		uuid = request.body.uuid

		return lib.return_fail(`unhandled toggle viz`, `unhandled toggle viz`)

	// ---------- layers (toolbox target) ----------
	// TODO authorship/permissions: for now any logged-in user touches only their own user_key rows

	case 'list_layers':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		value = await Layer.list_for_user( user.id )
		results.length = 0
		for( const l of value ){
			results.push( await l.publish_with_items() )
		}
		// pseudo future: paginate/lazy by bbox — filter elements by request.body.bounds + zoom here
		//   els = els.filter(in_bounds) // only viewport-visible features
		return {
			success: true,
			layers: results,
		}

	case 'create_layer':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		value = new Layer({
			uuid: request.body.layer?.id || lib.random_hex(8),
			user_key: user.id,
			name: request.body.layer?.name || 'new layer',
			visible: true,
			border_image: request.body.layer?.border_image || null,
			primary_color: request.body.layer?.primary_color || '#ff3366',
			secondary_color: request.body.layer?.secondary_color || '#3388ff',
			tertiary_color: request.body.layer?.tertiary_color || '#33cc99',
		})
		res = await value.save()
		if( !res?.success ) return lib.return_fail( res, `error creating layer`)
		return {
			success: true,
			layer: await value.publish_with_items(),
		}

	case 'update_layer':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		value = await Layer.get_by_uuid( request.body.layer?.id )
		if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
		// TODO: verify value.user_key === user.id (or shared/collab grant)
		const patch = {}
		if( request.body.layer?.name !== undefined ) patch.name = request.body.layer.name
		if( request.body.layer?.visible !== undefined ) patch.visible = request.body.layer.visible
		if( request.body.layer?.border_image !== undefined ) patch.border_image = request.body.layer.border_image
		if( request.body.layer?.primary_color !== undefined ) patch.primary_color = request.body.layer.primary_color
		if( request.body.layer?.secondary_color !== undefined ) patch.secondary_color = request.body.layer.secondary_color
		if( request.body.layer?.tertiary_color !== undefined ) patch.tertiary_color = request.body.layer.tertiary_color
		value.hydrate( patch )
		res = await value.save()
		if( !res?.success ) return lib.return_fail( res, `error updating layer`)
		return {
			success: true,
			layer: await value.publish_with_items(),
		}

	case 'delete_layer':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		value = await Layer.get_by_uuid( request.body.layer?.id )
		if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
		// TODO: verify value.user_key === user.id
		// pseudo: cascade-delete elements — DELETE FROM layer_elements WHERE layer_key=?
		sql = `DELETE FROM layer_elements WHERE layer_key=?`
		await pool.queryPromise( sql, value.id )
		await value.unset()
		return {
			success: true,
		}

	case 'add_layer_element':
		// client: fetch_wrap('/action_main', 'post', {
		//   action: 'add_layer_element',
		//   layer_uuid: '<active layer uuid>',
		//   element: { kind:'restaurant', name:'...', lat, lng, icon:'restaurant', data:{...} },
		// }, true)
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		value = await Layer.get_by_uuid( request.body.layer_uuid )
		if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
		// TODO: verify value.user_key === user.id
		const el_in = request.body.element || {}
		if( typeof el_in.lat !== 'number' || typeof el_in.lng !== 'number' ){
			return lib.return_fail(`element needs lat/lng`, `pick a spot on the map first`)
		}
		item = new LayerElement({
			uuid: lib.random_hex(8),
			layer_key: value.id,
			kind: el_in.kind || 'icon',
			name: el_in.name || '',
			lat: el_in.lat,
			lng: el_in.lng,
			icon: el_in.icon || el_in.kind || 'icon',
			data: el_in.data || {},
			geojson: el_in.geojson || null,
		})
		res = await item.save()
		if( !res?.success ) return lib.return_fail( res, `error saving element`)
		return {
			success: true,
			element: item.to_client(),
		}

	case 'list_layer_elements':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		value = await Layer.get_by_uuid( request.body.layer_uuid )
		if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
		// TODO: verify value.user_key === user.id
		// pseudo future: WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? for bbox lazy-load
		item = await LayerElement.list_for_layer( value.id )
		return {
			success: true,
			elements: item.map( e => e.to_client() ),
		}

	default:
		return lib.return_fail( `unhandled action: ${action}`, `unhandled action`)

	}

	return response

} // action






const handle_qr = async( request, response, render ) => {

	try{

		const query = request.query

		const user = request.session.USER

		log('flag', 'qr query', {
			query,
		})

		// -- shim / demo stuff:

		const BURGER_DEMOS = request.path === '/qr/xcv97' || request.path === '/qr/xcv456'

		const MEGA_BURGER = `daa490dade94cb97`

		if( BURGER_DEMOS ){
			query.add = MEGA_BURGER
		}

		// -- end shim

		if( query.add ){

			// if not logged, save URL of unlogged user and send them through login
			if( !lib.is_logged( request ) ){
				request.session.route_memory = request.url
				return response.send( render('redirect', request, '?prompt_login=1' ) )
			}

			// else, delete the whole 'memory' thing and on with it
			delete request.session.route_memory

			// get item
			const item = await get_item({
				uuid: query.add,
			})
			if( !item ){
				return response.send( render('error', request, 'item not found') )
			}

			// place of item
			const place = await GET.establishment({
				id: item.esta_key,
			})
			if( !place ) return response.send( render('error', request, 'place not found') )

			// proceed
			const redirect = `establishment/${place.uuid}?add=${query.add}`

			return response.send( render('redirect', request, redirect) )

		}else if( query.lotto ){

			//

		}else if( query.coupon ){

			//

		}else if( query.order ){

			return response.send( render('error', request, 'QR codes not yet handled') )

		}

		return response.send( render('error', request, 'unknown QR code') )

	}catch( err ){
		log('flag', 'err handle qr', err )
		return response.send( render('error', request, 'error handling QR code') )
	}

} // handle qr









const get_line_item = async( args ) => {
	const {
		uuid,
	} = args

	const pool = DB.getPool()
	let sql, res

	sql = `SELECT * FROM line_items WHERE uuid=?`
	res = await pool.queryPromise( sql, uuid )
	if( res.error ) return log('flag', 'err get order', res.error)
	if( res.results?.length ){
		return new LineItem( res.results[0] )
	}

} // get order



const get_item = async( args ) => {
	const {
		id,
		uuid,
	} = args

	const pool = DB.getPool()
	let sql, res

	if( id ){
		sql = `SELECT * FROM items WHERE id=?`
		res = await pool.queryPromise( sql, id )
	}else{
		sql = `SELECT * FROM items WHERE uuid=?`
		res = await pool.queryPromise( sql, uuid )
	}

	if( res.error ) return log('flag', 'err get order', res.error )		

	if( res.results?.length ){
		return new Item( res.results[0] )
	}

} // get item





const get_media_item = async( slug ) => {
	const pool = DB.getPool()
	let sql, res
	sql = `SELECT * FROM media_library WHERE slug=?`
	res = await pool.queryPromise( sql, slug )
	if( res.error ) return log('flag', res.error, `error getting media item`)
	if( !res.results?.length ) return log('flag', 'media item not found - ' + slug)
	return new MediaItem( res.results[0] )
}


















export default {
	action,
	handle_qr,
}
