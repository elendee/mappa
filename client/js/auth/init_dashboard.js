import ui from '../ui.js'
import * as lib from '../lib.js'
import hal from '../hal.js'
import fetch_wrap from '../fetch_wrap.js'
import Mappa from '../classes/Mappa.js'
import MapView from '../classes/MapView.js'
import MapElement from '../classes/MapElement.js'
import BROKER from '../EventBroker.js'





// decl

const content = document.getElementById('content')
const map = document.getElementById('map')
const panel = document.getElementById('layer-panel')



// base style is fixed to CARTO positron (see Mappa.init)

const params = new URLSearchParams( window.location.search )
const init_uuid = params.get( 'm' )

const mappa = window.mappa = new Mappa()

await mappa.init({
	container: content,
	// center
	// zoom
	// maxBounds
	// attributionControl
})

mappa._bind_nav({
	MapView,
	nav: panel,
})

let joined

let res = await mappa.refresh_layers({
	MapView,
	type: 'user',
	silent: true,
	init_uuid,
})
if( res.init_uuid ) joined = res.init_uuid

res = await mappa.refresh_layers({
	MapView,
	type: 'others',
	silent: true,
	init_uuid,
})
if( res.init_uuid ) joined = res.init_uuid

if( init_uuid ){
	if( !joined ){
		hal('error', `failed to join init map: ${init_uuid}`, 10 * 1000 )
	}
}


const forward_map_item = event => {
	mappa.set_map_item({
		MapElement,
		...event,
	})
}


BROKER.subscribe('MAPPA_SET_MAPVIEW', mappa.set_mapview_active )
BROKER.subscribe('MAPPA_SET_TOOL', mappa.set_tool_active )
BROKER.subscribe('ADD_MAP_ITEM_DATA', forward_map_item )

// await lib.sleep( 100 )

// handle an incoming map uuid via query param (?m=<uuid>)
// clicks the matching map row once it is present in the DOM.
// returns { state:'activated', uuid } when the param map was clicked,
// { state:'not_found', uuid } when the param map uuid has no matching row,
// { state:'absent' } when no 'm' param was provided.
// const activate_map_param = async () => {

// 	if( !uuid ) return { state: 'absent', uuid: null }

// 	let button
// 	for( let i = 0; i < 50; i++ ){
// 		button = mappa.DOM.panel.querySelector( `.mappa-row[data-layer-uuid='${uuid}']` )
// 		if( button ) break
// 		await lib.sleep( 100 )
// 	}

// 	if( button ){
// 		button.click()
// 		return { state: 'activated', uuid }
// 	}

// 	return { state: 'not_found', uuid }
// }

// const { state, uuid } = await activate_map_param()

// // 'm' param given but no matching row yet: ask the server to join/reserve it.
// // server-side handling for 'join_map' added later; just send the action for now.
// if( state === 'not_found' ){
// 	await fetch_wrap('/action_main', 'post', { action: 'join_map', mapview_uuid: uuid })
// 	hal( 'error', `Map not found: ${uuid}`, 5000 )
// }

// // no 'm' param: join a map session, then fall back to the last-active map row.
// if( state === 'absent' ){
// 	await fetch_wrap('/action_main', 'post', { action: 'join_map' })

// 	const active_uuid = localStorage.getItem( mappa.active_field )
// 	if( active_uuid ){
// 		const button = mappa.DOM.panel.querySelector( `.mappa-row[data-layer-uuid='${active_uuid}']` )
// 		if( button ){
// 			button.click()
// 		}
// 	}
// }
