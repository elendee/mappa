import { Modal } from '../Modal.js'
import BROKER from '../EventBroker.js'
import Model from './Model.js'
import * as lib from '../lib.js'
import { build_base_layer_form, BASE_LAYER_GROUPS, setBaseLayerVisible } from '../baseLayers.js'
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

// base map style is fixed — group matchers in baseLayers.js target these ids
const POSITRON_STYLE = `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`

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

		this.initialized = undefined
		this.active_layer = undefined
		this._pending_base_layer = undefined

		this.active_field = 'mappa-active-layer'
	}

	async init( args ){
		const {
			container,
			center = NYC.CENTER,
			zoom = NYC.ZOOM,
			maxBounds = NYC.BOUNDS,
			attributionControl = true,
		} = args || {}

		if( this.initialized ) return console.error('dupe mappa init')
	    this.initialized = Date.now()

		await this._load_script()

		this.DOM = {
			map: container.querySelector('#map'),
			panel: container.querySelector('#layer-panel'),
			user_layer: container.querySelector('#user-layers-section'),
			other_layer: container.querySelector('#other-layers-section'),
			toolbox: {
				wrap: lib.b('div', 'toolbox'),
				content: lib.b('div', false, 'toolbox-content'),
				name: lib.b('div', false, 'toolbox-name'),
				toggle: lib.b('div', false, 'toolbox-toggle'),
			},
		}
		this._init_toolbox()

		for( const key in this.DOM ){
			if( !this.DOM[key] ) console.warn('missing dom ele', key )
		}

		// init maplibre here
		this.map = new maplibregl.Map({
	    	container: this.DOM.map,
	    	style: POSITRON_STYLE,
	    	center,
	    	zoom,
	    	maxBounds,
	    	attributionControl,
	    });

	    // a layer can be selected before the style finishes loading;
	    // replay the pending prefs once the style is ready
	    this.map.on('load', () => this._apply_pending_base_layers() )
	    this.map.on('styledata', () => this._apply_pending_base_layers() )

	    return this.map;

	}

	_init_toolbox(){
		const {
			toolbox
		} = this.DOM

		const {
			wrap,
			name,
			content,
			toggle,
		} = toolbox

		wrap.append( name )
		wrap.append( content )
		wrap.append( toggle )

		toggle.innerHTML = '^'

		toggle.addEventListener('click', e => {
			wrap.classList.toggle('toggled')
		})

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
			expl: 'Basic settings for your map. These can be edited anytime.',
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

	_bind_nav( args ){
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


	set_layer_active = async( event ) => {
		const {
			layer,
		} = event

		console.log('set-layer', event )

		const {
			uuid,
			name,
			listed,
			locked,
			mappa, // ( should be this )
		} = layer

		if( !this.DOM.toolbox.wrap.parent ){
			document.body.append( this.DOM.toolbox.wrap )
		}

		this.DOM.toolbox.name.innerText = name

		this.DOM.toolbox.content.innerHTML = ''

		// refill this.DOM.toolbox.content

		this.fill_toolbox({
			layer,
		})
		.catch( err => {
			console.error( 'err fill toolbox', err )
		})

		this.active_layer = uuid

		localStorage.setItem( this.active_field, uuid )

		this.apply_base_layers( layer )

	}


	set_tool_active = async( event ) => {
		const {
			wrap,
			is_custom,
			tool_data,
		} = event

		hal('success', 'set tool ' + tool_data.name + '; click to place', 5000 )

		console.log('set-tool-active', event )

		// blank slate
		const tools = wrap.parentElement.querySelectorAll('.tool-wrap')
		for( const ele of tools ){
			ele.classList.remove('selected')
		}
		wrap.classList.add('selected')

		this.active_tool = tool_data.slug

		if( window.innerWidth > 800 ){ // desktop

			this.set_cursor({
				state: true,
				tool_data,
			})

		}else{ // mobile



		}


	} // set tool active


	set_cursor( args ){
		const {
			state,
			tool_data,
		} = args

		const type = tool_data.slug

		if( !state ){
			window.removeEventListener('mousemove', move_img_cursor )
			window.removeEventListener('click', unset_img_cursor )
			document.body.classList.remove('dragging')
			return;
		}

		let url
		if( tool_data.is_custom ){
			// img_cursor.querySelector('img').src
		}else{
			img_cursor.querySelector('img').src = `/resource/tools/${tool_data.slug}.png`
		}

		document.body.classList.add('dragging')

		document.addEventListener('mousemove', move_img_cursor )
		document.addEventListener('click', unset_img_cursor )

	} // set cursor


	// update the map with the active layer's saved base-layer prefs
	// (layer.layer_roads … layer.layer_land; missing/null = visible default).
	// defers if the style isn't loaded yet — replayed on load/styledata.
	apply_base_layers( layer ){
		if( !layer || !this.map ) return false
		if( typeof this.map.isStyleLoaded === 'function' && !this.map.isStyleLoaded() ){
			this._pending_base_layer = layer
			return false
		}
		this._pending_base_layer = undefined
		for( const g of BASE_LAYER_GROUPS ){
			const raw = layer[ 'layer_' + g.id ]
			const visible = ( raw === undefined || raw === null ) ? true : !!raw
			setBaseLayerVisible( this.map, g.id, visible )
		}
		return true
	}

	_apply_pending_base_layers(){
		if( this._pending_base_layer && this.map?.isStyleLoaded?.() ){
			const layer = this._pending_base_layer
			this._pending_base_layer = undefined
			this.apply_base_layers( layer )
		}
	}


	async fill_toolbox( args ){
		const {
			layer,
		} = args

		this.DOM.toolbox.content.innerText = ''

		let res = await fetch_wrap('/action_main', 'post', {
			action: 'get_toolbox',
			layer_uuid: layer.uuid,
		})

		console.log('fill toolbox', {
			res,
		})

		if( !res?.success ){
			return hal('error', res?.msg || 'error filling style', 5000 )
		}else{
			//
		}

		for( const data of res.results || [] ){
			const tool = build_tool({
				mappa: this,
				data,
			})
			this.DOM.toolbox.content.append( tool )
		}

	} // fill toolbox




} // Mappa





const build_tool = args => {
	const {
		mappa,
		is_custom,
		data,
	} = args

	const wrap = lib.b('div', false, 'tool-wrap', 'ib')

	console.log('build-tool', {
		is_custom,
		data,
	})

	const img = lib.b('img')
	img.src = `${is_custom ? '/fs' : '/resource/tools'}/${data.slug}.png`
	wrap.append( img )

	wrap.addEventListener('click', set_active_tool )

	MAP.set( wrap, {
		mappa,
		is_custom,
		tool_data: data,
	})

	return wrap

}



const set_active_tool = e => {
	const wrap = lib.click_parent( e.target, 'tool-wrap', false, 5 )
	const {
		is_custom,
		tool_data,
	} = MAP.get( wrap )

	BROKER.publish('MAPPA_SET_TOOL', {
		is_custom,
		tool_data,
		wrap,
	})

}



let img_cursor = lib.b('div', 'img-cursor')
const _img = lib.b('img')
img_cursor.append( _img )
document.body.append( img_cursor ) // shows only on classlist dragging

const move_img_cursor = e => {
	img_cursor.style.top = e.clientY + 'px'
	img_cursor.style.left = e.clientX + 'px'
}

const unset_img_cursor = e => {
	window.removeEventListener('mousemove', move_img_cursor )
	img_cursor.style.display = 'none'
}









export default Mappa