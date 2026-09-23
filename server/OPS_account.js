import env from './.env.js'
import bcrypt from 'bcryptjs'
// import { fileTypeFromFile } from 'file-type'
import detect_type from 'detect-file-type'
import fs from 'fs'
import DB from './db.js'
import log from './log.js'
import User from './models/User.js'
// import Alcove from './models/Alcove.js'
import MediaItem from './models/MediaItem.js'
import Notification from './models/Notification.js'
import lib from './lib.js'
// import auth from './auth.js'
import PUBLIC from './data/PUBLIC.js'
import PRIVATE from './data/PRIVATE.js'
import BROKER from './BROKER.js'
import STORE from './STORE_HANDLER.js'
import QR from './QR.js'
import * as mail from './mail.js'
import * as CRUD from './CRUD.js'
// import PushSubscribe from './models/PushSubscribe.js'






const action = async( request ) => {

	if( !lib.is_logged( request )) return lib.return_fail( 'unlogged account request', 'must be logged')

	const user = request.session.USER

	const pool = DB.getPool()

	const { 
		action, 
		data 
	} = request.body

	let sql, res 
	const results = []

	let value, content, allowed

	switch( action ){

	case 'get_push_presence':
		/*
			client can have notifications in device enabled
			but have to cross ref with db to make sure they will get them
		*/

		sql = `SELECT * FROM ${PushSubscribe.table} WHERE user_key=? AND endpoint=?`
		res = await pool.queryPromise( sql, [ user.id, request.body.subscription?.endpoint ] )
		if( res.error ) return lib.return_fail( res.error, `error getting subscribes`)
		if( !res.results?.length ){
			return {
				success: false,
				// no message needed
			}
		}
		return {
			success: true,
		}

	case 'set_push_state':

		const {
			allow_push,
			subscription,
		} = request.body

		const {
			endpoint,
			expirationTime,
			keys,
		} = subscription

		if( allow_push ){ // enable device by device

			// check dupes
			sql = `SELECT * FROM ${PushSubscribe.table} WHERE user_key=? AND endpoint=?`
			res = await pool.queryPromise( sql, [ user.id, endpoint ])
			if( res.error ) return lib.return_fail( res.error, `error subscribing`)
			if( res.results?.length) return lib.return_fail(`already exists`, `already exists`)

			value = new PushSubscribe({
				user_key: user.id,
				endpoint,
				json: JSON.stringify( subscription ),
			})
			await value.save()

		}else{ // but go ahead and purge all on any un-toggle - this is user intuition

			// value = await PushSubscribe.get_user_instance({
			// 	user_key: user.id,
			// 	endpoint,
			// })
			// if( !value ) return lib.return_fail(`failed to find sub`, `could not find sub`)

			const sanitycheck = 100
			sql = `DELETE FROM push_subscribes WHERE user_key=? LIMIT ${sanitycheck}`
			res = await pool.queryPromise( sql, user.id )
			if( res.error ) return lib.return_fail(res.error, `error unsetting`)

			// await value.unset()

		}

		return {
			success: true,
		}

	case 'set_language':
		const lang_setting = request.body.type + '_lang'
		if( !Object.keys( user ).includes( lang_setting ) ) return lib.return_fail({
			msg: `invalid setting: ${request.body.type}`,
			type: request.body.type,
			keys: Object.keys( user ),
		} , `invalid setting`)

		if( request.body.value ){

			let lang
			for( const _lang of PUBLIC.LANGUAGES ){
				if( _lang == request.body.value ){
					lang = request.body.value
					break;
				}
			}
			if( !lang ) return lib.return_fail(`inavlid lang chosen: ${request.body.value}`, `invalid language`)

			user[ lang_setting ] = request.body.value

		}else{

			user[ lang_setting ] = ''

		}

		await user.save()

		return {
			success: true,
		}

	case 'account_qr':
		res = await QR.make( request )
		return {
			success: true,
			qr: res.path,
		}

	case 'set_push_state':
		user.allow_push = !!request.body.checked
		await user.save()
		return {
			success: true,
			state: user.allow_push
		}

	case 'set_reading_lang':
		user.reading_lang = request.body.selected?.trim() || ''
		await user.save()

		return {
			success: true,
		}

	case 'save_ascii':
		const _user_ascii = request.body.value
		if( typeof _user_ascii !== 'string' || _user_ascii?.length > PUBLIC.LIMITS.USER.ASCII_COVER ){
			return lib.return_fail(`invalid ascii`, `invalid ascii`)
		}

		user.user_ascii = request.body.value
		await user.save()

		return {
			success: true,
		}

	case 'update_notify':
		// decl
		value = request.body.value
		content = 'notify_' + request.body.name
		// only allow notify fields...
		if( !PUBLIC.NOTIFICATIONS[ request.body.name ] ){
			return lib.return_fail('invalid field', 'invalid field')
		}
		// check if theyre enabling while blocked
		if( user.notify_block ){
			if( request.body.name !== 'block' && value ){
				return lib.return_fail('attempted enable while blocking', `${ request.body.name } failed to enable - uncheck "block" first`)
			}
		}
		sql = `UPDATE users SET ${ content }=? WHERE id=? LIMIT 1`
		res = await pool.queryPromise( sql, [ value, user.id ] )
		if( res.error ) return lib.return_fail( res.error, 'error updating')
		user[ content ] = value
		return {
			success: true,
		}

	case 'get_account_coves':


		// -- first JOINED rooms

		sql = {
			sql: `
			SELECT * FROM cove_joins cj
			INNER JOIN alcoves a ON cj.cove_key=a.id
			WHERE cj.user_key=?`,
			nestTable: true,
		}
		res = await pool.queryPromise( sql, [ user.id, user.id ] )
		if( res.error ) log('flag', res.error )

		allowed = new Alcove().get_request_allowed( request )

		const all_uuids = []
		for( const r of res.results || []){
			if( !r.a?.name || !r.a?.uuid ){
				log('flag', 'invalid cove', r.a )
				continue
			}

			const alcove = new Alcove( r.a )
			const pub = alcove.publish( allowed )
			all_uuids.push( pub.uuid )
			results.push( pub )
		}


		// -- add user OWNER coves

		sql = `SELECT * FROM alcoves WHERE owner_key=?`
		res = await pool.queryPromise( sql, user.id )
		if( res.error ) log('flag', res.error )

		for( const r of res.results || [] ){

			if( all_uuids.includes( r.uuid )) continue;
			const cove = new Alcove( r )
			const pub = cove.publish( allowed )
			pub.is_owner = true
			results.push( pub )
		}


		// -- add DM's

		sql = `SELECT * FROM alcoves WHERE user_key1=? OR user_key2=?`
		res = await pool.queryPromise( sql, [ user.id, user.id ] )
		if( res.error ) log('flag', res.error )

		for( const r of res.results ){
			if( all_uuids.includes( r.uuid ) ) continue;
			const cove = new Alcove( r )
			const name = await cove.get_display_name()
			const pub = cove.publish( allowed )
			pub.name = name
			// if( cove.is_dm() ){
			// 	pub.is_dm = true
			// }
			pub.is_dm = true
			results.push( pub )
		}


		// -- add Notifications

		sql = {
			sql: `SELECT * FROM notifications n
			LEFT JOIN alcoves a ON n.cove_key=a.id
			WHERE user_key=?`,
			nestTables: true,
		}
		res = await pool.queryPromise( sql, user.id )
		if( res.error ){
			log('flag', 'get notifies err', res.error )
		}
		const res_notifies = {}
		allowed = new Notification().get_view_allowed(0,0,0)
		for( const r of res.results ){
			if( !r.a?.id ) continue
			if( !res_notifies[ r.a.uuid ] ){
				res_notifies[ r.a.uuid ] = 0
			}
			res_notifies[ r.a.uuid ]++
		}

		return {
			success: true,
			results,
			res_notifies,
		}

	case 'get_media_library':
		
		sql = `SELECT * FROM media_library WHERE user_key=? ORDER BY id DESC`
		res = await pool.queryPromise( sql, user.id )
		if( res.error ) return lib.return_fail( res.error, 'error fetching media library')
		for( const r of res.results ){
			const item = new MediaItem( r )
			results.push( item.publish( item.get_request_allowed( request ) ) )
		}
		return {
			success: true,
			results,
		}

	case 'set_field':

		res = await user.set_field( request.body.data, true )

		return res

	case 'get_account':

		value = user.publish( user.get_request_allowed( request ) )

		const _p = {}

		return {
			success: true,
			user: value,
			places: _p,
		}

	case 'abc':
		break;

	default:
		return lib.return_fail(`no action defined: ${action}`, `no action defined`)

	}

} // action








export default {
	action,
}