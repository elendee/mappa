import env from './env.js'
import hal from './hal.js'



class MessageBroker {

	constructor(){

		this.subscribers = {}

		if( env.EXPOSE ) window.EVENTS = {}

	}

	publish( event, data ){

		if( !this.subscribers[ event ] ){
			if( !env.BROKER_OPTIONALS?.includes( event ) ){
				console.warn('missing subscriber: ' + event )
			}
			return;
		}

		// if( env.LOCAL && !env.LOG_BROKER_EXCLUDES.includes( event ) ){
		// 	if( event !== 'SOCKET_SEND' || !env.LOG_WS_SEND_EXCLUDES.includes( data.type ) ){
		// 		console.log( event, data )
		// 	}
		// }

		const do_log = env.LOCAL && ( env.LOG_BROKER_EXCLUDES && !env.LOG_BROKER_EXCLUDES.includes( event ) )

		if( do_log ) console.group('BROKER publish:')
	    this.subscribers[ event ].forEach( subscriberCallback => {
			if( do_log ){
				console.log( event, data )
				hal('standard', event, 2000 )
			}
	    	subscriberCallback( data ) 
	    })
	    if( do_log ) console.groupEnd()

	}

	subscribe( event, callback ){

		if( !this.subscribers[event] ){
			this.subscribers[event] = []
			if( env.EXPOSE ) window.EVENTS[ event ] = true
			// if( env.LOG_BROKER.SUBSCRIBE ) console.log('subscribe: ', event )
		}
	    
	    this.subscribers[event].push( callback )

	}

}

const broker = new MessageBroker()

if( env.EXPOSE ) window.BROKER = broker

export default broker

