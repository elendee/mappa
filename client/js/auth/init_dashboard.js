import ui from '../ui.js'
import * as lib from '../lib.js'
import Mappa from '../classes/Mappa.js'
import MapView from '../classes/MapView.js'
import MapElement from '../classes/MapElement.js'
import BROKER from '../EventBroker.js'





// decl

const content = document.getElementById('content')
const map = document.getElementById('map')
const panel = document.getElementById('layer-panel')



// base style is fixed to CARTO positron (see Mappa.init)


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

await mappa.refresh_layers({
	MapView,
	type: 'user',
	silent: true,
})

await mappa.refresh_layers({
	MapView,
	type: 'others',
	silent: true,
})


const forward_map_item = event => {
	mappa.set_map_item({
		MapElement,
		...event,
	})
}


BROKER.subscribe('MAPPA_SET_MAPVIEW', mappa.set_mapview_active )
BROKER.subscribe('MAPPA_SET_TOOL', mappa.set_tool_active )
BROKER.subscribe('ADD_MAP_ITEM_DATA', forward_map_item )

await lib.sleep( 100 )

const active_uuid = localStorage.getItem( mappa.active_field )
if( active_uuid ){
	const button = mappa.DOM.panel.querySelector(`.mappa-row[data-layer-uuid='${active_uuid}']`)
	if( button ){
		button.click()
	}
}
