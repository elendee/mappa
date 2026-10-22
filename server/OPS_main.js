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
import MapView from './models/MapView.js'
import MapElement from './models/MapElement.js'
import Toolset from './models/Toolset.js'
import Tool from './models/Tool.js'
import Friendship from './models/Friendship.js'
import MapJoin from './models/MapJoin.js'
import FIELDS from './data/FIELDS.js'
import BROKER from './BROKER.js'
import SVGS from './data/SVGS.js'
import sockets from './SOCKETS.js'
import * as GET from './GET.js'







const mutex_states = [
	'ready', 
	'working', 
	'canceled'
]



const action = async( request ) => {

	const { 
		action 
	} = request.body

	const user = request.session?.USER

	const pool = DB.getPool()
	let sql, res, pre_res, post_res 

	let value, model, account, err_msg, pub, place, uuid, order, line_item, item, can_edit, req_user, allowed, layer, mapview, geojson, toolset

	const results = []
	const results_obj = {}

	const response = {
		success: false,
	}

	switch( action ){

	case 'edit_element_img':

		value = await GET.map_element({
			uuid: request.body.uuid
		})
		if( !value ) return lib.return_fail({
			msg: `cant find element`,
			uuid: request.body.uuid,
		}, `already joined`)		

		value.img_slug_custom = request.body.slug

		await value.save()

		return {
			success: true,
		}


	case 'save_map':

		// get map
		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail(`map not found: ${request.body.mapview_uuid}`, `map not found`)

		// dupes
		value = await GET.map_join({
			user_key: user.id,
			view_key: mapview.id,
		})
		if( value ) return lib.return_fail({
			msg: `already joined`,
			user_key,
			view_key,
		}, `already joined`)

		// validate
		if( mapview.hidden ) return lib.return_fail({
			msg: 'map inaccessible to joins',
			uuid: request.body.mapview_uuid,
		}, `map not currently available`)

		// join
		value = new MapJoin({
			user_key: user.id,
			view_key: mapview.id,
			role: PUBLIC.ROLES.visitor.slug,
		})
		await value.save()

		return {
			success: true,
			mapview: mapview.publish( mapview.get_request_allowed( request ) ),
		}

	case 'remove_icon':

		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged`, `must be logged`)

		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail(`map not found: ${request.body.mapview_uuid}`, `map not found`)

		allowed = await mapview.can_edit_map( request )
		if( !allowed ) return lib.return_fail(`invalid permission`, `invalid permission`)

		item = await GET.map_element({
			uuid: request.body.uuid,
		})
		if( !item ) return lib.return_fail(`item not found: ${request.body.uuid}`, `item not found`)

		await item.unset()

		return {
			success: true,
			item: item.publish( item.get_request_allowed( request ) )
		}

	case 'view_map':

		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail(`map not found: ${request.body.mapview_uuid}`, `map not found`)

		allowed = await mapview.can_view( request )
		if( !allowed ){
			return lib.return_fail({
				msg: 'block map',
				user_id: user.id,
				map_uuid: request.body.mapview_uuid,
			}, `you are unable to view this map`)
		}

		value = mapview.publish( mapview.get_request_allowed( request ) )
		value.can_edit = await mapview.can_edit_map( request )
		value.is_owner = mapview.user_key === user.id

		return {
			success: true,
			mapview: value
		}

	case 'search_maps':

		const search_map_type = request.body.value ? request.body.type : 'empty'
		
		switch( request.body.type ){

		// case 'user':
		// 	sql = `SELECT * FROM users WHERE handle LIKE ? OR uuid=?`
		// 	res = await pool.queryPromise( sql, [
		// 		`%${request.body.value}%`,
		// 		`%${request.body.value}%`,
		// 	])
		// 	if( res.error ) return lib.return_fail( res.error, `error searching`)

		// 	return {
		// 		success: true,
		// 	}
		case 'empty':
			sql = {
				sql: `
				SELECT * FROM mapviews m
				LEFT JOIN users u ON m.user_key=u.id
				WHERE m.listed=1 AND ( m.hidden=0 OR m.hidden IS NULL )
				ORDER BY m.created DESC
				LIMIT 100`,
				nestTables: true,
			}
			res = await pool.queryPromise( sql )
			if( res.error ) return lib.return_fail( res.error, `error searching`)			
			break;

		case 'name':
			sql = {
				sql: `
				SELECT * FROM mapviews m
				LEFT JOIN users u ON m.user_key=u.id
				WHERE m.listed=1 AND ( m.hidden=0 OR m.hidden IS NULL ) AND m.name LIKE ?
				LIMIT 100`,
				nestTables: true,
			}
			res = await pool.queryPromise( sql, `%${request.body.value}%`)
			if( res.error ) return lib.return_fail( res.error, `error searching`)
			break;

		case 'id':
			sql = {
				sql: `
				SELECT * FROM mapviews m
				LEFT JOIN users u ON m.user_key=u.id
				WHERE m.uuid=? AND ( m.hidden IS NULL OR m.hidden=0 )
				LIMIT 100`,
				nestTables: true,
			}
			res = await pool.queryPromise( sql, request.body.value )
			if( res.error ) return lib.return_fail( res.error, `error searching`)
			break;

		default:
			return lib.return_fail(`invalid search map: ${request.body.type}`, `invalid search`)
		}

		// name / id
		allowed = new User().get_request_allowed( request )
		for( const r of res.results || [] ){
			const mapview = new MapView( r.m )
			const pub = mapview.publish( mapview.get_request_allowed( request ) )
			if( r.u?.id ){
				const user = new User( r.u )
				const upub = user.publish( allowed )
				pub.user = upub
			}
			results.push( pub )
		}

		return {
			success: true,
			results,
		}

	case 'set_toolset':
		if( !lib.is_logged( request )) return lib.return_fail(`must be logged`, `must be logged`)

		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail( `map not found: ${request.body.mapview_uuid}`, `map not found`)

		// get tool-set
		toolset = await GET.toolset({
			uuid: request.body.uuid,
		})
		if( !toolset ) return lib.return_fail( `set not found: ${request.body.uuid}`, `icon set not found`)

		mapview.toolset_key = toolset.id

		await mapview.save()

		return {
			success: true,
			toolset: toolset.publish( toolset.get_request_allowed( request ) )
		}

	case 'create_set':

		if( !lib.is_logged( request )){
			return lib.return_fail(`must be logged`, `must be logged`)
		}

		uuid = await lib.get_unique_uuid( DB, 'toolsets', FIELDS.PERSISTS_UUID.Toolset )

		if( typeof request.body.name != 'string' || request.body.name.length > 50 ){
			return lib.return_fail(`invalid set name`, `invalid set name`)
		}

		value = new Toolset({
			user_key: user.id,
			uuid,
			name: request.body.name,
			is_public: request.body.is_public,
		})

		await value.save()

		return {
			success: true,
		}

	case 'get_all_toolsets':

		results_obj.user_sets = []
		results_obj.other_sets = []

		// get user sets
		sql = `SELECT * FROM toolsets WHERE is_public=1 OR user_key=? ORDER BY created DESC`
		res = await pool.queryPromise( sql, [ user.id ] )
		if( res.error ) return lib.return_fail( res.error, `error getting toolsets`)

		for( const r of res.results ){
			const set = new Toolset( r )
			const pub = set.publish( set.get_request_allowed( request ) )
			if( set.user_key === user.id ){
				results_obj.user_sets.push( pub )
			}else{
				results_obj.other_sets.push( pub )
			}
		}

		return {
			success: true,
			results_obj,
		}

	case 'get_map_items':

		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail(`failed to find view: ${request.body.mapview_uuid}`, `failed to find view`)

		sql = `SELECT * FROM map_elements WHERE view_key=?`
		res = await pool.queryPromise( sql, mapview.id )
		if( res.error ) return lib.return_fail(res.error, `error getting map-elements`)

		for( const r of res.results ){
			const item = new MapElement( r )
			const pub = item.publish( item.get_request_allowed( request ))
			// ownership follows the parent mapview (not the item placer),
			// so only the layer owner gets the edit form
			pub.is_owner = !!( user?.id && mapview.user_key === user.id )
			// join tool so client can render icon without extra fetch
			// (tool_key / Tool.id are not published, so attach what client needs)
			const _tool = await GET.tool({ id: r.tool_key })
			if( _tool ){
				const tool_pub = _tool.publish( _tool.get_request_allowed( request ))
				pub.tool = tool_pub
				pub.tool_uuid = tool_pub.uuid
				pub.img_slug = tool_pub.img_slug
			}
			results.push( pub )
		}

		return {
			success: true,
			results,
			is_owner: !!( user?.id && mapview.user_key === user.id ),
			mapview_uuid: mapview.uuid,
		}

	case 'place_icon':
		/*
			focus on tool type and coords only
			handle user data / customizations as an edit mode
		*/

		log('flag', 'place-icon', request.body )

		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail(`failed to find view: ${request.body.mapview_uuid}`, `failed to find view`)

		allowed = await mapview.can_edit_map( request )
		if( !allowed ){
			return lib.return_fail(`not allowed to edit`, `not allowed to edit`)
		}

		let tool = await GET.tool({
			uuid: request.body.icon_uuid,
		})
		if( !tool ) return lib.return_fail(`failed to find tool: ${request.body.tool_uuid}`, `failed to find tool`)

		uuid = await lib.get_unique_uuid( DB, 'map_elements', FIELDS.PERSISTS_UUID.MapElement )

		geojson = {
			type: 'Point',
			coordinates: [
				request.body.lng,
				request.body.lat,
			]
		}

		value = new MapElement({
			uuid,
			user_key: user.id,
			view_key: mapview.id,
			tool_key: tool.id,
			type: tool.type,
			geojson,
		})

		res = await value.save()
		value.id = res.id
		value.created = res.created
		value.edited = res.edited

		log('flag', 'place-icon success - may want some kind of push mechanism here....')

		const item_pub = value.publish( value.get_request_allowed( request ))
		const tool_pub = tool.publish( tool.get_request_allowed( request ))
		item_pub.tool = tool_pub
		item_pub.tool_uuid = tool_pub.uuid
		item_pub.img_slug = tool_pub.img_slug
		item_pub.is_owner = !!( user?.id && mapview.user_key === user.id )

		return {
			success: true,
			item: item_pub,
			mapview_uuid: mapview.uuid,
		}

	case 'update_location':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)

		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail(`failed to find view: ${request.body.mapview_uuid}`, `failed to find view`)
		if( mapview.user_key !== user.id ) return lib.return_fail(`not your layer`, `you can only move icons on your own layers`)

		sql = `SELECT * FROM map_elements WHERE uuid=? LIMIT 1`
		res = await pool.queryPromise( sql, request.body.element_uuid )
		if( res.error ) return lib.return_fail( res.error, `error finding icon`)
		if( !res.results?.length ) return lib.return_fail(`icon not found: ${request.body.element_uuid}`, `icon not found`)
		value = new MapElement( res.results[0] )
		if( value.view_key !== mapview.id ) return lib.return_fail(`icon does not belong to layer`, `icon does not belong to this layer`)

		const _lat = Number( request.body.lat )
		const _lng = Number( request.body.lng )
		if( !Number.isFinite( _lat ) || !Number.isFinite( _lng ) ) return lib.return_fail(`invalid location`, `invalid location`)

		value.geojson = {
			type: 'Point',
			coordinates: [
				_lng,
				_lat,
			],
		}

		try{
			res = await value.save()
		}catch( err ){
			return lib.return_fail( err, `error moving icon`)
		}

		const _tool = await GET.tool({ id: value.tool_key })

		const moved_pub = value.publish( value.get_request_allowed( request ))
		if( _tool ){
			const moved_tool_pub = _tool.publish( _tool.get_request_allowed( request ))
			moved_pub.tool = moved_tool_pub
			moved_pub.tool_uuid = moved_tool_pub.uuid
			moved_pub.img_slug = moved_tool_pub.img_slug
		}
		moved_pub.is_owner = true

		return {
			success: true,
			item: moved_pub,
			mapview_uuid: mapview.uuid,
		}

	case 'get_user_maps':
		if( !user.id ) return lib.return_fail(`must be logged`, `must be logged`)

		sql = `SELECT * FROM mapviews WHERE user_key=?`
		res = await pool.queryPromise( sql, user.id )
		if( res.error ) return lib.return_fail( res.error, `error getting user layers`)

		for( const r of res.results ){
			const layer = new MapView( r )
			const pub = layer.publish( layer.get_request_allowed( request ))
			pub.is_owner = true
			pub.can_edit = true
			results.push( pub )
		}

		return {
			success: true,
			results,
		}





	case 'get_view_toolset':

		// get mapview
		value = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !value ) return lib.return_fail(`mapview not found ${request.body.mapview_uuid}`, `mapview not found`)

		// get toolset if exists
		toolset = await GET.toolset({
			id: value.toolset_key,
		})
		if( !toolset ){
			return {
				success: true,
				toolset: undefined,
			}
		}

		// pub
		value = toolset.publish( toolset.get_request_allowed( request ) )
		value.tools = []

		const tools = await toolset.get_tools()
		for( const data of tools || []){
			const tool = new Tool( data )
			const pub = tool.publish( tool.get_request_allowed( request))
			value.tools.push( pub )
		}

		return {
			success: true,
			toolset: value,
		}


	case 'get_joined_maps':

		if( !lib.is_logged( request )) return lib.return_fail(`must be logged`, `must be logged`)

		sql = {
			sql: `SELECT * FROM map_joins mj
			LEFT JOIN mapviews m ON m.id=mj.view_key
			WHERE mj.user_key=?
			ORDER BY mj.created DESC LIMIT 500`,
			nestTables: true,
		}

		res = await pool.queryPromise( sql, user.id )
		if( res.error ) return lib.return_fail( res.error, `error getting map joins`)

		for( const r of res.results ){
			if( r.m?.id ){
				const view = new MapView( r.m )
				const pub = view.publish( view.get_request_allowed( request ) )
				pub.can_edit = await view.can_edit_map( request )
				pub.is_owner = view.user_key === user.id // should always be false here...
				results.push( pub )
			}
		}

		return {
			success: true,
			results,
		}

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

		// save
		res = await MODELS.create( request )
		if( !res?.success ) return res

		// sanitize...
		delete res.full_model 

		// done
		return res


	case 'update_model':

		// validate
		res = await allow_update({
			request,
		})
		if( !res?.success ) return res;

		// business logic
		res = await MODELS.update( request )
		if( !res?.success ) return res

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
		})
		return res

	case 'model_toggle_viz':
		type = request.body.type // (model)
		value = request.body.desired_state
		uuid = request.body.uuid

		return lib.return_fail(`unhandled toggle viz`, `unhandled toggle viz`)

	// ---------- layers (toolbox target) ----------
	// TODO authorship/permissions: for now any logged-in user touches only their own user_key rows

	// case 'list_layers':
	// 	if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
	// 	value = await MapView.list_for_user( user.id )
	// 	results.length = 0
	// 	for( const l of value ){
	// 		results.push( await l.publish_with_items() )
	// 	}
	// 	// pseudo future: paginate/lazy by bbox — filter elements by request.body.bounds + zoom here
	// 	//   els = els.filter(in_bounds) // only viewport-visible features
	// 	return {
	// 		success: true,
	// 		layers: results,
	// 	}

	case 'create_layer':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)

		uuid = await lib.get_unique_uuid( DB, 'mapviews', FIELDS.PERSISTS_UUID.MapView )

		value = new MapView({
			uuid,
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

	// case 'update_layer':
	// 	if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
	// 	value = await MapView.get_by_uuid( request.body.layer?.id )
	// 	if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
	// 	// TODO: verify value.user_key === user.id (or shared/collab grant)
	// 	const patch = {}
	// 	if( request.body.layer?.name !== undefined ) patch.name = request.body.layer.name
	// 	if( request.body.layer?.visible !== undefined ) patch.visible = request.body.layer.visible
	// 	if( request.body.layer?.border_image !== undefined ) patch.border_image = request.body.layer.border_image
	// 	if( request.body.layer?.primary_color !== undefined ) patch.primary_color = request.body.layer.primary_color
	// 	if( request.body.layer?.secondary_color !== undefined ) patch.secondary_color = request.body.layer.secondary_color
	// 	if( request.body.layer?.tertiary_color !== undefined ) patch.tertiary_color = request.body.layer.tertiary_color
	// 	value.hydrate( patch )
	// 	res = await value.save()
	// 	if( !res?.success ) return lib.return_fail( res, `error updating layer`)
	// 	return {
	// 		success: true,
	// 		layer: await value.publish_with_items(),
	// 	}

	case 'delete_layer':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		value = await MapView.get_by_uuid( request.body.layer?.id )
		if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
		// TODO: verify value.user_key === user.id
		// pseudo: cascade-delete elements — DELETE FROM layer_elements WHERE layer_key=?
		sql = `DELETE FROM layer_elements WHERE view_key=?`
		await pool.queryPromise( sql, value.id )
		await value.unset()
		return {
			success: true,
		}

	// case 'add_layer_element':
	// 	// client: fetch_wrap('/action_main', 'post', {
	// 	//   action: 'add_layer_element',
	// 	//   layer_uuid: '<active layer uuid>',
	// 	//   element: { kind:'restaurant', name:'...', lat, lng, icon:'restaurant', data:{...} },
	// 	// }, true)
	// 	if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
	// 	value = await MapView.get_by_uuid( request.body.layer_uuid )
	// 	if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
	// 	// TODO: verify value.user_key === user.id
	// 	const el_in = request.body.element || {}
	// 	if( typeof el_in.lat !== 'number' || typeof el_in.lng !== 'number' ){
	// 		return lib.return_fail(`element needs lat/lng`, `pick a spot on the map first`)
	// 	}
	// 	item = new MapElement({
	// 		uuid: lib.random_hex(8),
	// 		layer_key: value.id,
	// 		kind: el_in.kind || 'icon',
	// 		name: el_in.name || '',
	// 		lat: el_in.lat,
	// 		lng: el_in.lng,
	// 		icon: el_in.icon || el_in.kind || 'icon',
	// 		data: el_in.data || {},
	// 		geojson: el_in.geojson || null,
	// 	})
	// 	res = await item.save()
	// 	if( !res?.success ) return lib.return_fail( res, `error saving element`)
	// 	return {
	// 		success: true,
	// 		element: item.to_client(),
	// 	}

	// case 'list_layer_elements':
	// 	if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
	// 	value = await MapView.get_by_uuid( request.body.layer_uuid )
	// 	if( !value ) return lib.return_fail(`layer not found`, `layer not found`)
	// 	// TODO: verify value.user_key === user.id
	// 	// pseudo future: WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? for bbox lazy-load
	// 	item = await MapElement.list_for_layer( value.id )
	// 	return {
	// 		success: true,
	// 		elements: item.map( e => e.to_client() ),
	// 	}

	case 'update_tool_img':
		// abc
		value = await GET.tool({
			uuid: request.body.tool_uuid,
		})
		if( !value ) return lib.return_fail({
			msg: `not found`,
			uuid: request.body.tool_uuid,
		}, `icon not found`)

		value.img_slug = request.body.slug

		await value.save()

		return {
			success: true,
			item: value.publish( value.get_request_allowed( request ))
		}

	case 'save_tool_icon':
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		mapview = await GET.mapview({
			uuid: request.body.mapview_uuid,
		})
		if( !mapview ) return lib.return_fail(`mapview not found`, `mapview not found`)
		if( mapview.user_key !== user.id ) return lib.return_fail(`not your mapview`, `you can only add icons to your own mapviews`)
		item = await get_media_item( request.body.media_slug )
		if( !item ) return lib.return_fail(`upload not found: ${request.body.media_slug}`, `upload not found`)
		if( item.user_key !== user.id ) return lib.return_fail(`not your upload`, `you can only use your own uploads`)

		toolset = await GET.toolset({
			id: mapview.toolset_key,
		})
		if( !toolset ) return lib.return_fail(`must choose icon set first`, `must choose icon set first`)

		uuid = await lib.get_unique_uuid( DB, 'tools', FIELDS.PERSISTS_UUID.Tool )

		const _slug = Tool._format_slug( request.body.type )

		value = new Tool({
			uuid,
			user_key: user.id,
			set_key: toolset.id,
			name: request.body.name,
			type: request.body.type,
			slug: _slug,
			img_slug: item.slug,
		})
		res = await value.save()
		if( !res?.success ) return lib.return_fail( res, `error saving icon`)
		return {
			success: true,
			tool: value.publish( value.get_request_allowed( request ) ),
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



const allow_update = async( args ) => {
	const {
		request,
	} = args

	if( request.body.type === 'MapView' ){
		if( !lib.is_logged( request ) ) return lib.return_fail(`must be logged in`, `must be logged in`)
		let mapview = await GET.mapview({
			uuid: request.body.model?.uuid,
		})
		if( !mapview ) return lib.return_fail(`failed to find view: ${request.body.model?.uuid}`, `layer not found`)
		if( !lib.is_admin( request ) && mapview.user_key !== user.id ){
			return lib.return_fail(`not your layer`, `you can only edit your own layers`)
		}
	}

	return {
		success: true,
	}

}














export default {
	action,
	handle_qr,
}
