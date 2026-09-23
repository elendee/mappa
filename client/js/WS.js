import ui from './ui.js?v=78'
import env from './env.js?v=78'
import hal from './hal.js?v=78'
import BROKER from './EventBroker.js?v=78'
import USER from './USER.js?v=78'
import WS_ROUTER from './WS_ROUTER.js?v=78'
import Spinner from './Spinner.js?v=78'



const spinner = new Spinner({
	type: 'svg',
})


let packet, SOCKET 


const init = ( ws_url ) => {

	return new Promise( ( resolve, reject ) => {

		if( !ws_url ) return hal('error', 'invalid ws url', 5000 )

		spinner.show()

		SOCKET = window.SOCKET = new WebSocket( ws_url )

		SOCKET.onopen = function( event ){
			spinner.hide()
			resolve( SOCKET )
		}

		SOCKET.onmessage = function( msg ){

			packet = false

			try{

				packet = JSON.parse( msg.data )

				// switch( packet.type ){

				// case 'pong_place':
				// 	BROKER.publish('PONG_PLACE', {
				// 		packet,
				// 	})
				// 	break;

				// default:
				// 	console.warn('unknown packet', packet )
				// 	break;
				// }

			}catch( e ){

				SOCKET.bad_messages++
				if( SOCKET.bad_messages > 100 ) {
					console.log('100+ faulty socket messages', msg )
					SOCKET.bad_messages = 0
				}
				console.warn('failed to parse server msg: ', msg )
				return false	

			}

			if( 0 && env.LOCAL && !env.LOG_WS_RECEIVE_EXCLUDES.includes( packet.type ) ){
				console.log( packet )
			}

			WS_ROUTER( packet )

		}

		SOCKET.onerror = function( data ){
			hal('error', 'server error')
			reject( data )
		}

		SOCKET.onclose = function( event ){
			if( !env.PRODUCTION ) console.log( 'CLOSE', event )
			hal('error', 'connection closed by server')
			if( document.hidden ){
				BROKER.publish('SITE_TITLE', {
					interval: 1000,
					msg: 'connection closed',
				})
			}

		}

	})

}


let send_packet

const send = event => {

	send_packet = event 

	if( SOCKET.readyState === 1 ){
		SOCKET.send( JSON.stringify( send_packet ) )
	}else{
		console.log('socket not ready', event )
	}

}


BROKER.subscribe('SOCKET_SEND', send )

export default {
	init,
}

