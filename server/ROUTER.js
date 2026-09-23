import log from './log.js'
import env from './.env.js'
import lib from './lib.js'
import auth from './auth.js'
import BROKER from './BROKER.js'
import SOCKETS from './SOCKETS.js'










function heartbeat(){
	// DO NOT convert to arrow function or else your sockets will silently dis-connect ( no "this" )
	this.isAlive = Date.now()
}





let sweeping_users

const sweep_sockets = () => {

	if( sweeping_users ) return;

	sweeping_users = setInterval(() => {

		for( const uuid in SOCKETS ){
			if( !SOCKETS[uuid].isAlive ){
				BROKER.publish('PURGE_SOCKET', {
					socket: SOCKETS[uuid],
					uuid,
				})
				continue
			}
			SOCKETS[uuid].isAlive = false
			SOCKETS[uuid].ping()
		}

		setTimeout(() => {
			if( !Object.keys( SOCKETS).length ){
				clearInterval( sweeping_users )
				sweeping_users = false
			}
		}, 500 )

	}, 9 * 1000 )

} // sweep sockets






const bind_user = async( socket, USER, WORLD ) => {

	// handle sessions without http requests
	if( !socket?.request?.session?.USER ){
		// await bind_purgatory( socket )
		return socket.send( JSON.stringify({
			type: 'hal',
			msg_type: 'error',
			msg: 'invalid user',
		}))
	}

	sweep_sockets()

	let packet

	if( !USER?.uuid ) throw new Error('user not initialized correctly')

	log('flag', 'BIND: proceeding')

	socket.on('pong', heartbeat )

	socket.isAlive = true

	socket.on('message',  ( data ) => {

		try{ 

			packet = lib.sanitize_packet( JSON.parse( data ) )

			if( !env.WS_ROUTER_IGNORE_LOG?.includes( packet.action )){
				log('ws_router', {
					action: packet.action,
				})				
			}

			// if( !packet.action && env.LOCAL ){
			// 	log('flag', 'invalid packet', packet )
			// }

			switch( packet.action ){

			case 'join_layer':
			case 'join_cove':
				BROKER.publish('WORLD_JOIN_LAYER', {
					socket,
					packet,
					USER,
				})
				break;

			case 'remove_chat':
				BROKER.publish('REMOVE_CHAT', {
					socket,
					packet,
					USER,
				})
				break;

			case 'send_chat':
				BROKER.publish('HANDLE_CHAT', {
					socket,
					packet,
					USER,
				})
				break;

			case 'ping_user':
				BROKER.publish('PING_USER', {
					socket,
					packet,
					USER,
				})
				break;

			case 'user_activity':
				BROKER.publish('USER_ACTIVITY', {
					socket,
					packet,
					USER,
				})
				break;

			case 'active_friends':
				BROKER.publish('ACTIVE_FRIENDS', {
					socket,
					packet,
					USER,
				})
				break;

			default: 
				log('flag', 'unknown packet action: ', packet )
				break;

			}

		}catch( err ){
			log('flag', err)
		}

	}) // on message

	socket.on('close', e => {
		log('wss', 'socket close: native ws event:', Object.keys( e ) )
		BROKER.publish('SOCKET_DISCONNECT', {
			socket,
		})
	})

	return {
		success: true,
	}

} // bind user











export default {
	bind_user,
}
