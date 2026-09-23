import env from './.env.js'
import log from './log.js'
import color from './color.js'

class MessageBroker {
// export default class MessageBroker {

	constructor(){

		this.subscribers = {}

	}

	publish( event, data ){

		if( !this.subscribers[ event ] ){
			log('flag','event missing subscriber', event )
			return
		}

		// if( !env.LOG_BROKER?.includes( event ) ){
		// 	log('broker', event )
		// 	// log('broker', event, data )
		// }

	    this.subscribers[ event ].forEach( subscriberCallback => {
	    	if( !env.SKIP_LOG_BROKER?.includes( event ) ){
	    		log('broker', event, color( 'orange', subscriberCallback.name ), ( env.LOG_BROKER_DATA ? data : '' ) )
	    	}
	    	subscriberCallback( data ) 
	    })

	}

	subscribe( event, callback ){

		if( !this.subscribers[event] )  this.subscribers[event] = []

		if( !callback ) return log('flag', 'missing callback for subscribe: ', event )
	    
	    this.subscribers[event].push( callback )

	}

	unsubscribe( event, index ){
		this.subscribers.splice( index, 1 )
	}

}


const broker = new MessageBroker()

// let broker = false
// module.exports = (() => {
// 	if( broker ) return broker
// 	broker = new MessageBroker()
// 	return broker
// })()

export default broker