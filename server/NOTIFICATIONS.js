import env from './.env.js'
import DB from './db.js'
import log from './log.js'
import lib from './lib.js'
import BROKER from './BROKER.js'
// import PushSubscribe from './models/PushSubscribe.js'
import User from './models/User.js'
import web_push from 'web-push'
import Notification from './models/Notification.js'
import * as mail from './mail.js'
import PUBLIC from './data/PUBLIC.js'








const pushing_notify = {}

const send_msg_notification = async( event ) => {
	const {
		sender,
		user,
		html_msg,
		html_subject,
		notify_subject,
		notify_msg,
		dm_cove,
	} = event

	if( !user?.id ||  !sender?.id ) return log('flag', 'both users must have accounts for notify')

	if( !user?.id ) return log('flag', 'user must be logged in for notifies', {
		user_uuid: user?.uuid,
	})

	const pool = DB.getPool()
	let sql, res

	sql = `SELECT * FROM ${PushSubscribe.table} WHERE user_key=?`
	res = await pool.queryPromise( sql, user.id )
	if( res.error ) return log('flag', 'err check notifies', res.error )

	const user_has_push = res.results?.length

	const debounce_slug = user?.uuid + '_' + sender?.uuid

	if( user_has_push ){

		if( pushing_notify[ debounce_slug ] ){
			return;
		}
		pushing_notify[ debounce_slug ] = setTimeout(()=> {

			if( typeof notify_subject !== 'string' ) return log('flag', 'invalid notify msg', {
				user_id: user?.id,
			})

			if( typeof dm_cove?.uuid !== 'string' ) return log('flag', 'invalid dm cove uuid', {
				user_id: user?.id,
			})

			_send_push_to_user({
				user_id: user?.id, 
				title: notify_subject, 
				body: notify_msg, 
				data: {
					url: env.PUBLIC_ROOT + '/alcove/' + dm_cove?.uuid
				}
				// data = {}
			})
			.catch( err => {
				log('flag', 'err push notify', err )
			})

			delete pushing_notify[ debounce_slug ]

		}, 30 * 1000 )

	}else if( user.notify_messages ){

		if( typeof html_msg !== 'string' || html_msg.length > 10 * 1000 ) return log('flag', 'send-notify fail sanity check', html_msg?.length )

		// debounce with db value

		sql = `SELECT * FROM notify_mail_sends WHERE user_key=? ORDER BY created DESC LIMIT 5`
		res = await pool.queryPromise( sql, user?.id )
		if( res.error ) return log('flag', res.error )

		if( res.results?.[0]){
			const {
				created,
			} = res.results[0]
			const elapsed = ( Date.now() - created ) / 1000 / 60 / 60
			if( elapsed < PUBLIC.LIMITS.CHAT.BUFFER_NOTIFY_DM_HOURS ){
				const need = Math.round( PUBLIC.LIMITS.CHAT.BUFFER_NOTIFY_DM_HOURS / 1000 / 60 ) + 'min'
				return log('flag', 'too soon message debounce', {
					user_key: user.id,
					elapsed: Math.round( elapsed / 1000 )+'s, need ' + need,
				})
			}
		}

		// update for debounce testing
		const now = Date.now()
		sql= `
		INSERT INTO notify_mail_sends (user_key, sender_key, created, edited) 
		VALUES (${user.id},${sender.id},${now},${now})`
		res = await pool.queryPromise( sql )
		if( res.error ) return log('flag', 'err send notify', res.error )

		// format text
		const text = lib.user_data( html_msg, {
			strip_html: true,
		})

		// send
		res = await mail.sendmail({
			to: user.email,
			from: env.MAIL.ADMIN,
			html: html_msg,
			text,
			subject: html_subject,
		})

	}else{

		if( env.LOCAL ) log('flag', 'user has no notify setting...')

	}

} // send dm notification








const _send_push_to_user = async( args ) => {
	const {
		user_id, 
		title, 
		body, 
		data = {}
	} = args

	const pool = DB.getPool()
	let sql, res

	// get user
	const user = await User.get_instance({
		column: 'id',
		value: user_id,
	})
	if( !user ) return log('flag', 'user not found for notify', {
		user_id,
		title,
	})

	log('notifies', 'start: send-push-to-user', {
		user_id: user?.id,
	})

	// get all notifies
	sql = `SELECT * FROM ${PushSubscribe.table} WHERE user_key=?`
	res = await pool.queryPromise( sql, user_id )
	if( res.error ) return log('flag', 'err get notifies', res.error )

	const payload = JSON.stringify({ 
		title, 
		body, 
		data 
	});

	let successCount = 0;

	// 2. Send to each device
	for( const r of res.results ){

		let subscription

		try{

			const parsed = JSON.parse( r.json )

			const {
				endpoint,
				expirationTime,
				keys,
			} = parsed

			subscription = {
				endpoint,
				keys: { 
					p256dh: keys.p256dh, 
					auth: keys.auth 
				}
			};

			await web_push.sendNotification( subscription, payload, {
				TTL: 60 * 60  // 1 hour retry window
			});

			successCount++;

		}catch( err ){
			// err...
			log('flag', 'failed to send and/ or parse notify json', {
				// r,
				err,
				// subscription,
			})
			continue
		}

	}

	log('notifies', 'end: ',{
		successCount,
		rows: res.results?.length,
		user_id,
	})

	return successCount;

}








const add_notification = async( event ) => {
	/*
		sent when receiver is not present
	*/
	const {
		sender_key,
		user_key, //: _away_rcv.id,
		cove_key, //: this.id,
		chat_key, //: chat.id,
	} = event

	const notification = new Notification({
		user_key,
		cove_key,
		chat_key,
		sender_key,
	})

	let res = await notification.save()

} // add notification








const clear_notifications = async( event ) => {
	const {
		user_key,
		cove_key,
	} = event || {}

	const pool = DB.getPool()
	let sql, res

	sql = `DELETE FROM notifications WHERE user_key=? AND cove_key=?`
	res = await pool.queryPromise( sql, [ user_key, cove_key ])
	if( res.error ) return log('flag', 'err clear notify', res.error )

	// done


} // clear notification










BROKER.subscribe('ADD_NOTIFICATION', add_notification )
BROKER.subscribe('SEND_MSG_NOTIFICATION', send_msg_notification )
BROKER.subscribe('CLEAR_NOTIFICATIONS', clear_notifications )



export default {
	send_msg_notification,
	add_notification,
}