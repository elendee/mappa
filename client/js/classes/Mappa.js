import { Modal } from '../Modal.js'
import BROKER from '../EventBroker.js'
import Model from './Model.js'
import * as lib from '../lib.js'
import { build_base_layer_form } from '../baseLayers.js'
import draggable from '../draggable.js'
import fetch_wrap from '../fetch_wrap.js'
import hal from '../hal.js'





const MAP = new Map()

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

		this.DOM = {
			map: container.querySelector('#map'),
			panel: container.querySelector('#layer-panel'),
			user_layer: container.querySelector('#user-layers-section'),
			other_layer: container.querySelector('#other-layers-section'),
		}

		for( const key in this.DOM ){
			if( !this.DOM[key] ) console.warn('missing dom ele', key )
		}

		// init maplibre here
		this.map = new maplibregl.Map({
	    	container: this.DOM.map,
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

	pop_edit_layer( args ){
		const {
			extant_row,
			extant_data,
			is_edit,
			Layer,
		} = args || {}

		const modal = new Modal({
			type: 'edit-layer',
			expl: 'Basic settings for your layer. These can be edited anytime.',
		})

		modal.make_columns()

		const drag = lib.b('div', false, 'drag-icon')
		drag.innerHTML = `<img src='/resource/icons/drag.png'>`
		modal.content.prepend( drag )

		const selected = []
		for( const key in extant_data ){
			if( key.match(/^layer_/)){
				// const _key = key.replace('layer_', '')
				if( extant_data[ key] ) selected.push( key.replace('layer_', '') )
			}
		}

		console.log('pop edit', {
			selected,
			extant_data,
		})

		const base_layers = lib.b('div', false, 'base-layer-wrap')
		const base_ele = this._build_base_ele({
			selected,
			// extant_layer_data: extant_data,
		})
		base_layers.append( base_ele )
		modal.right_panel.append( base_layers )

		const _layer = new Layer( extant_data )
		_layer.extant_row = extant_row
		_layer.mappa = this
		const form = _layer.build_edit_form()
		modal.left_panel.append( form )

		document.body.append( modal.ele )

		BROKER.publish('MAKE_DRAGGABLE', {
			ele: modal.content,
			storage_key: 'mappa-edit-layer',
		})

	}

	_build_base_ele( args ){
		const {
			// extant_layer_data,
			selected,
			onChange,
		} = args || {}

		return build_base_layer_form({
			// extant_layer_data,
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
			this.pop_edit_layer({
				Layer,
			})
		})

		find_btn.addEventListener('click', e => {
			console.log('find')
		})

	}


	async refresh_layers( args ){
		const {
			Layer,
			type,
			silent,
		} = args

		let res, action, container

		switch( type ){

		case 'user':
			action = 'get_user_layers'
			container = this.DOM.user_layer
			break;

		case 'others':
			action = 'get_other_layers'
			container = this.DOM.other_layer
			break;

		default:
			return console.warn('unknown refresh type', type )
		}

		res = await fetch_wrap('/action_main', 'post', {
			action,
		}, true )

		if( !res?.success ) return silent || hal('error', res?.msg || 'error getting layers', 5000 )

		for( const layer of res.results || [] ){
			const extant = container.querySelector('.layer-row[data-layer-uuid="' + layer.uuid + '"]')
			if( extant ) continue;
			const _layer = new Layer( layer )
			// _layer.extant_row = 
			_layer.mappa = this
			const _new = _layer.build_row({
				data: layer,
			})
			container.append( _new )
		}

	} // refresh-layers






} // Mappa







export default Mappa