import { Modal } from '../Modal.js'
import BROKER from '../EventBroker.js'
import Model from './Model.js'
import * as lib from '../lib.js'
import { build_base_layer_form } from '../baseLayers.js'
import draggable from '../draggable.js'





const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
const STYLE_BASE = `https://tiles.openfreemap.org/styles/` //liberty
const MAPLIBRE_ESM = [
	'https://esm.sh/maplibre-gl@4.7.1?bundle',
	'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm',
]


export const NYC = {
	CENTER:[
		-74.006,
		40.7128
	],
	ZOOM:10.5,
	BOUNDS:[
		[-74.5,40.4],
		[-73.5,41.1]
	]
}




class Mappa extends Model {
	constructor( init ){
		super( init )
		init = init || {}
		this.bla = init.bla || 5
	}

	async init( args ){
		const {
			container,
			style = 'positron',
			center = NYC.CENTER,
			zoom = NYC.ZOOM,
			maxBounds = NYC.BOUNDS,
			attributionControl = true,
		} = args || {}

		await this._load_script()

		// init maplibre here
		this.map = new maplibregl.Map({
	    	container,
	    	style: `https://basemaps.cartocdn.com/gl/${style}-gl-style/style.json`,
	    	center,
	    	zoom,
	    	maxBounds,
	    	attributionControl,
	    });

	    return this.map;

	}

	async _load_script(){

		if( window.maplibregl ) return window.maplibregl
		let lastErr
		for( const url of MAPLIBRE_ESM ){
			try{
				const mod = await import( url )
				window.maplibregl = mod.default || mod
				return window.maplibregl
			}catch( e ){ lastErr = e }
		}
		console.error('[map] failed to load maplibre-gl', lastErr)
		if( mapEl ) mapEl.innerText = 'Failed to load map.'
		return null

	}

	pop_new_layer( args ){
		const {
			Layer,
		} = args || {}

		const modal = new Modal({
			type: 'edit-layer',
		})

		modal.make_columns()

		const expl = lib.b('div', false, 'layer-expl')
		expl.innerText = 'Basic settings for your layer.  These can be edited anytime.'
		modal.content.prepend( expl )

		const base_layers = lib.b('div', false, 'base-layer-wrap')
		const base_ele = this._build_base_ele()
		base_layers.append( base_ele )
		modal.right_panel.append( base_layers )

		const _map = new Layer()
		const form = _map.build_edit_form()

		modal.left_panel.append( form )

		document.body.append( modal.ele )

		BROKER.publish('MAKE_DRAGGABLE', {
			ele: modal.content,
			storage_key: 'mappa-edit-layer',
		})

	}

	_build_base_ele( args ){
		const {
			selected,
			onChange,
		} = args || {}

		return build_base_layer_form({
			selected,
			onChange,
		})
	}

	bind_nav( args ){
		const {
			Layer,
			nav,
		} = args || {}

		const create_btn = nav.querySelector('#add-layer')
		const find_btn = nav.querySelector('#find-layer')

		create_btn.addEventListener('click', e => {
			this.pop_new_layer({
				Layer,
			})
		})

		find_btn.addEventListener('click', e => {
			console.log('find')
		})

	}


} // Mappa



export default Mappa