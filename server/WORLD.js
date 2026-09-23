import env from './.env.js'
import BROKER from './BROKER.js'
import DB from './db.js'
import log from './log.js'
import lib from './lib.js'
import ROUTER from './ROUTER.js'
import FIELDS from './data/FIELDS.js'
import SOCKETS from './SOCKETS.js'
import User from './models/User.js'
import PRIVATE from './data/PRIVATE.js'
import PUBLIC from './data/PUBLIC.js'
import * as GET from './GET.js'







class World {
	constructor( init ){
		init = init || {}
 
		this.COVES = {}

	}



	bring_online = async( args ) => {

		if( this.waking ) return;
		this.waking = Date.now()

		delete this.waking

	} // bring online



	init_user = async( args ) => {
		const {
			socket,
		} = args

		const USER = socket.request.session.USER = new User( socket.request.session.USER )

		if( !USER.uuid ){
			const _uuid = await lib.get_unique_uuid( DB, 'users', FIELDS.PERSISTS_UUID.User )
			USER.uuid = _uuid
		}

		if( SOCKETS[ USER.uuid ] ){

			SOCKETS[ USER.uuid ].send( JSON.stringify({
				type: 'hal',
				msg_type: 'error',
				msg: 'This account was opened in a new tab',
				time: 999 * 1000,
			}))

			SOCKETS[ USER.uuid ].close( 1000, 'flush dupe socket')

			await lib.sleep( 500 )

			// return lib.return_fail_socket({
			// 	socket,
			// 	msg: 'You seem to have another tab still connected',
			// 	private_msg: 'block dupe socket join',
			// 	time: 15000,
			// })
		}
		SOCKETS[ USER.uuid ] = socket
		socket.user_uuid = USER.uuid

		await ROUTER.bind_user( socket, USER, this )

		socket.send( JSON.stringify({
			type: 'init_user',
			user: USER.publish( USER.get_view_allowed(1,1,1) ),
		}))

	} // init user



	// leave_member = async( args ) => {
	// 	/*
	// 		initiated by joiner / member
	// 	*/
	// 	const {
	// 		socket,
	// 		packet,
	// 		USER,
	// 	} = args

	// 	if( !USER.id ) return lib.return_fail_socket({
	// 		socket,
	// 		msg: 'must be logged',
	// 		private_msg: 'block anon join',
	// 		time: 5000,
	// 	})

	// 	const {
	// 		uuid,
	// 	} = packet

	// 	const cove = this.COVES[ uuid ]
	// 	if( !cove ) return lib.return_fail_socket({
	// 		socket,
	// 		msg: 'could not find alcove',
	// 		private_msg: 'not cove for join',
	// 		time: 5000,
	// 	})

	// 	const extant_join = await GET.get_join({
	// 		user_key: USER.id,
	// 		cove_key: cove.id,
	// 	})

	// 	if( !extant_join ) return lib.return_fail_socket({
	// 		socket,
	// 		msg: 'Join not found',
	// 		private_msg: 'no join for leave',
	// 		time: 5000,
	// 	})

	// 	await extant_join.unset()

	// 	cove.broadcast( cove.get_sockets(), {
	// 		type: 'leave_member',
	// 		user_uuid: USER.uuid,
	// 	})

	// } // leave member







	join_layer = async( args ) => {
		const {
			socket,
			packet,
			USER,
		} = args

		const {
			cove_uuid,
		} = packet

		log('flag', 'join-layer', {
			packet,
		})

		// // Exists
		// const cove = await this.touch_cove({
		// 	uuid: cove_uuid
		// })
		// if( !cove ) return lib.return_fail_socket({
		// 	socket,
		// 	msg: 'cove not found',
		// 	private_msg: 'fail join-cove',
		// })

		// // Direct Messages: allow only the 2 userse
		// /*
		// 	handle by gatekeep....
		// */
		// // if( cove.is_dm() ){
		// // 	if( !USER.id || ( USER.id !== cove.user_key1 && USER.id !== cover.user_key2 ) ){
		// // 		return lib.return_fail_socket({
		// // 			socket,
		// // 			msg: 'private chat',
		// // 			private_msg: {
		// // 				msg:'blocked non-included user from private chat',
		// // 				user_id: USER.id,
		// // 				cove_uuid: cove.uuid,
		// // 			}
		// // 		})
		// // 	}
		// // }

		// // Alcove permissions settings
		// const _allowance = await cove.gatekeep({
		// 	user_key: USER.id,
		// })
		// if( typeof _allowance === 'string' ) return lib.return_fail_socket({
		// 	socket,
		// 	msg: _allowance,
		// 	private_msg: `block user join cove: ${lib.identify( USER )}`,
		// 	time: 3000
		// })

		// await cove.add_user({
		// 	socket,
		// 	packet,
		// 	user: USER,
		// })

	} // join cove







	// handle_chat = async( event ) => {
	// 	const {
	// 		socket,
	// 		packet,
	// 		USER,
	// 	} = event

	// 	const cove = this.COVES[ USER.current_alcove ]
	// 	if( !cove ) return lib.return_fail_socket({
	// 		socket,
	// 		msg: 'cove not found',
	// 		private_msg: 'cove not found: ' + USER.current_alcove,
	// 		time: 5000,
	// 	})

	// 	if( Date.now() - USER.last_chat < lib.times.second * 3 ){

	// 		socket.send( JSON.stringify({
	// 			type: 'restore_input_chat',
	// 			packet,
	// 		}))
			
	// 		return lib.return_fail_socket({
	// 			socket,
	// 			msg: 'wait a few seconds between chats',
	// 			private_msg: 'block user too fast',
	// 			time: 2000,
	// 		})

	// 	}

	// 	USER.last_chat = Date.now()

	// 	cove.handle_chat( event )

	// } // handle chat



	// cleanup_user = async( event ) => {
	// 	const {
	// 		user,
	// 		socket,
	// 		caller,
	// 	} = event

	// 	const cove = this.COVES[ user.current_alcove ]
	// 	if( !cove ) return log('flag', 'no cove cleanup-user', {
	// 		user: lib.identify( user ),
	// 		caller,
	// 	})

	// 	delete SOCKETS[ user.uuid ]
	// 	delete cove.USERS[ user.uuid ]

	// } // cleanup user




	// pong_user = async( event ) => {
	// 	const {
	// 		socket,
	// 		packet,
	// 		USER,
	// 	} = event

	// 	const {
	// 		uuid,
	// 	} = packet

	// 	const user = SOCKETS[ uuid ]?.request.session?.USER

	// 	if( !user ){
	// 		if( env.LOCAL ) log('flag', 'user not found', {
	// 			packet
	// 		})
	// 		return;
	// 	}

	// 	const _send = user.publish( user.get_view_allowed(0,0,0) )

	// 	socket.send( JSON.stringify({
	// 		type: 'pong_user',
	// 		user: _send
	// 	}) )

	// } // pong user



	pong_active_friends = event => {
		const {
			socket,
			packet,
			USER,
		} = event

		const {
			uuids,
		} = packet

		const state = {}

		// log('flag', 'getting?', packet )

		for( const uuid of uuids ){

			const socket = SOCKETS[ uuid ]
			if( !socket ) continue; // offline friend

			const last_active = socket.request.session?.USER?.last_active

			if( last_active ){

				const elapsed = Date.now() - last_active

				state[uuid] = lib.get_active_state({ // idle / active / gone
					elapsed,
				})

			}else{

				state[ uuid ] = 'gone'

			}

		}

		socket.send( JSON.stringify({
			type: 'friend_status',
			state,
		}))

	} // pong active friends




} // World

const WORLD = new World()









BROKER.subscribe('WORLD_JOIN_LAYER', WORLD.join_layer )
// BROKER.subscribe('WORLD_JOIN_MEMBER', WORLD.join_cove_member )
// BROKER.subscribe('WORLD_LEAVE_MEMBER', WORLD.leave_member )
// BROKER.subscribe('HANDLE_CHAT', WORLD.handle_chat )
// BROKER.subscribe('CLEANUP_USER', WORLD.cleanup_user )
// BROKER.subscribe('REMOVE_CHAT', WORLD.remove_chat )
// BROKER.subscribe('UPDATE_MODEL', WORLD.update_model )
// BROKER.subscribe('DO_CRON', WORLD.do_cron )
// BROKER.subscribe('PING_USER', WORLD.pong_user )
// BROKER.subscribe('USER_ACTIVITY', WORLD.set_user_active )
// BROKER.subscribe('ACTIVE_FRIENDS', WORLD.pong_active_friends )
// BROKER.subscribe('SET_SYNTAX_TYPE', WORLD.set_syntax_type )





export default WORLD