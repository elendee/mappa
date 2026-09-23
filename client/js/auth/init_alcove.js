import env from '../env.js?v=78'
import * as lib from '../lib.js?v=78'
import ui from '../ui.js?v=78'
import hal from '../hal.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'
import BROKER from '../EventBroker.js?v=78'
import { Modal } from '../Modal.js?V=7'
import USER from '../USER.js?v=78'
import Alcove from '../classes/Alcove.js?v=78'
import ALCOVE from '../ALCOVE.js?v=78'
import WS from '../WS.js?v=78'





// decl
const content = document.getElementById('content')
const cove_data = document.getElementById('cove-data')

const uuid = location.href.split('/alcove/')[1].split('?')[0]
const params = new URLSearchParams( location.search )
let pinging_orders
let COVE







// lib

const clear_old_tranlation_cache = () => {

	const now = Date.now()
	const limit = lib.times.month

	for( const key in localStorage ){
		if( key.match(/^alcoves_chat_lang_/)){
			try{
				const parsed = JSON.parse( localStorage[key] )
				const {
					stamp,
				} = parsed
				const elapsed = now - stamp
				if( elapsed > limit ) delete localStorage[key]
			}catch( err ){
				console.warn('invalid language cache', localStorage[key] )
			}
		}
	}

}









// bind









// init

if( !uuid ){

	content.innerHTML = 'Invalid data for Alcove'

}else{

	// init websocket

	WS.init( env.WS_URL )
	.then( socket => {

		clear_old_tranlation_cache()

		// wait for events - server sends init

	})

} // have valid uuid for establishment