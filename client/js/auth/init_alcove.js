import env from '../env.js'
import * as lib from '../lib.js'
import ui from '../ui.js'
import hal from '../hal.js'
import fetch_wrap from '../fetch_wrap.js'
import GLOBAL from '../GLOBAL.js'
import BROKER from '../EventBroker.js'
import { Modal } from '../Modal.js?V=7'
import USER from '../USER.js'
import Alcove from '../classes/Alcove.js'
import ALCOVE from '../ALCOVE.js'
import WS from '../WS.js'





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