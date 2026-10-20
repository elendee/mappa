import ui from '../ui.js'
import * as lib from '../lib.js'
import hal from '../hal.js'
import fetch_wrap from '../fetch_wrap.js'
import Mappa from '../classes/Mappa.js'
import MapView from '../classes/MapView.js'
import MapElement from '../classes/MapElement.js'
import BROKER from '../EventBroker.js'
import USER from '../USER.js'





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

let res = await mappa.refresh_mapviews({
	MapView,
	type: 'user',
	silent: true,
	init_uuid,
})
if( res.init_uuid ) joined = res.init_uuid

res = await mappa.refresh_mapviews({
	MapView,
	type: 'others',
	silent: true,
	init_uuid,
})
if( res.init_uuid ) joined = res.init_uuid

if( init_uuid ){

	if( !joined ){

		console.log('JOINING', {
			init_uuid,
		})

		fetch_wrap('/action_main', 'post', {
			action: 'view_map',
			mapview_uuid: init_uuid,
		})
		.then( res => {
			if( !res?.success ) return hal('error', res?.msg || 'error joining', 10 * 1000 )

			hal('success', 'joined: ' + init_uuid , 2000 )

			const view = new MapView( res.mapview )
			view.can_edit = res.mapview.can_edit
			view.is_owner = res.mapview.is_owner

			BROKER.publish('MAPPA_SET_MAPVIEW', {
				mapview: view,
				is_owner: view.is_owner,
				can_edit: view.can_edit,
				caller: 'init-param-join',
			})

		})

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


