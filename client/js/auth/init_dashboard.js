import ui from '../ui.js'
import * as lib from '../lib.js'
import Mappa from '../classes/Mappa.js'
import Layer from '../classes/Layer.js'





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
	Layer,
	nav: panel,
})

await mappa.refresh_layers({
	Layer,
	type: 'user',
	silent: true,
})

await mappa.refresh_layers({
	Layer,
	type: 'others',
	silent: true,
})


BROKER.subscribe('MAPPA_SET_LAYER', mappa.set_layer_active )

await lib.sleep( 100 )

const active_uuid = localStorage.getItem( mappa.active_field )
if( active_uuid ){
	const button = mappa.DOM.panel.querySelector(`.layer-row[data-layer-uuid='${active_uuid}']`)
	if( button ){
		button.click()
	}
}
