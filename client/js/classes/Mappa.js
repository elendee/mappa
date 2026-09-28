import { Modal } from '../Modal.js'
import Model from './Model.js'
import * as lib from '../lib.js'





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

		const base_layers = lib.b('div', false, 'base-layer-wrap')
		const base_ele = this._build_base_ele()
		modal.right_panel.append( base_layers )

		const _map = new Layer()
		const form = _map.build_edit_form()

		modal.left_panel.append( form )

		document.body.append( modal.ele )

	}

	_build_base_ele(){

		// pull in the code from '../baseLayers.js' here, but keep the code abstracted in a separate module.
		// forget localstorage - we only need to allow user to set the layers they want one time as they create the Layer.
		// i will handle the model fields - you just do the clientside form here for now.

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