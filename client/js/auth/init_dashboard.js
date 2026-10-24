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

const parse_start_data = start_data => {
	if( !start_data ) return

	let parsed = start_data
	if( typeof parsed === 'string' ){
		try{
			parsed = JSON.parse( parsed )
		}catch( err ){
			console.warn('invalid start_data', err )
			return
		}
	}

	const lat = Number( parsed?.lat )
	const lng = Number( parsed?.lng )
	const zoom = Number( parsed?.zoom )
	if( !Number.isFinite( lat ) || !Number.isFinite( lng ) || !Number.isFinite( zoom ) ) return

	return { lat, lng, zoom }
}

const mappa = window.mappa = new Mappa()

let init_start
if( init_uuid ){

	// prefer a mapview that is already in memory; otherwise ask the server
	let start_data = mappa.active_mapview?.start_data
	if( !start_data ){
		const start_res = await fetch_wrap('/action_main', 'post', {
			action: 'view_map',
			mapview_uuid: init_uuid,
		}, true )
		start_data = start_res?.mapview?.start_data
	}

	const start = parse_start_data( start_data )
	if( start ){
		init_start = {
			center: [ start.lng, start.lat ],
			zoom: start.zoom,
			maxBounds: null,
		}
	}

}

await mappa.init({
	container: content,
	...init_start,
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

const toggle_toolbox = event => {
	const {
		wrap,
	} = mappa.DOM.toolbox
	wrap.classList.toggle('toggled')
	BROKER.publish('ADJUST_TOOLBOX')
}



const adjust_toolbox = event => {
	const {
		wrap,
	} = mappa.DOM.toolbox

	const is_toggled = wrap.classList.contains('toggled')

	let bounds = wrap.getBoundingClientRect()

	let collapsed, full_height, window_height, has_viewport

	if( window.visualViewport ){
		collapsed = 50
		full_height = bounds.height
		window_height = window.visualViewport?.height 
		has_viewport = true
	}else{ // account for phone nav bars arbitrarily:
		collapsed = window.innerWidth < 800 ? 120 : 50
		full_height = window.innerWidth < 800 ? bounds.height + 30 : bounds.height
		window_height = window.innerHeight
	}

	if( is_toggled ){
		wrap.style.top = `calc( ${window_height}px - ${full_height}px)`
	}else{
		wrap.style.top = `calc( ${window_height}px - ${collapsed}px)`
	}

	// if( lib.is_admin ){
	// 	hal('standard', `admin: is-toggled: ${is_toggled}, bounds: ${bounds?.height}, has_view: ${has_viewport}`, 5000 )
	// }

}




BROKER.subscribe('TOGGLE_TOOLBOX', toggle_toolbox )
BROKER.subscribe('ADJUST_TOOLBOX', adjust_toolbox )
BROKER.subscribe('MAPPA_SET_MAPVIEW', mappa.set_mapview_active )
BROKER.subscribe('MAPPA_SET_TOOL', mappa.set_tool_active )
BROKER.subscribe('ADD_MAP_ITEM_DATA', forward_map_item )
BROKER.subscribe('UPDATE_TOOL_DATA', mappa.update_tool_data )
BROKER.subscribe('UPDATE_TOOLSET_IMAGE', mappa.update_toolset_image )
BROKER.subscribe('ADD_TO_MAPKEY', mappa.add_to_mapkey )
// BROKER.subscribe('INIT_START_VIEW', mappa.set_start_view_mode )