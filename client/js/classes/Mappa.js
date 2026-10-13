import env from '../env.js'
import { Modal } from '../Modal.js'
import BROKER from '../EventBroker.js'
import Model from './Model.js'
import * as lib from '../lib.js'
import { 
	build_base_layer_form, 
	BASE_LAYER_GROUPS, 
	setBaseLayerVisible 
} from '../baseLayers.js'
import draggable from '../draggable.js'
import fetch_wrap from '../fetch_wrap.js'
import hal from '../hal.js'


const MAP = new Map()

// const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'

// const MAPLIBRE_CSS = '/resource/inc/maplibre-gl.css'
// const STYLE_BASE = `https://tiles.openfreemap.org/styles/` //liberty
const MAPLIBRE_ESM = [
	'/resource/inc/maplibre-gl.bundle.mjs',
	// '/resource/inc/maplibre-gl@4.7.1?bundle',
	// 'https://esm.sh/maplibre-gl@4.7.1?bundle',
	// 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm',
]

const map_styles = {
	positron_local_all: `positron_offline.json`,
	positron_local_all_dark: `positron_offline_dark.json`,
	positron_local_json_only: `positron_local.json`,
	position_cloud: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`,
}

let USE_STYLE
if( !env.MAP_STYLE || env.MAP_STYLE.match(/cloud/) ){
	USE_STYLE = map_styles.position_cloud
}else{
	USE_STYLE = `/resource/styles/${map_styles[ env.MAP_STYLE || 'positron_local_all' ]}`
}


export const NYC = {
	CENTER:[
		-74.006,
		40.7128
	],
	ZOOM:10.5,
	BOUNDS:[
		[-74.1,40.5],
		[-73.8,40.9]
	]
}




class Mappa extends Model {
	constructor( init ){
		super( init )
		init = init || {}

		this.initialized = undefined
		this.active_mapview = undefined
		this._pending_base_mapview = undefined

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
			user_list: container.querySelector('#user-layers-section .layer-list'),
			other_list: container.querySelector('#other-layers-section .layer-list'),
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
		// workers are blob-URL based and can't resolve relative tile/glyph urls,
		// so absolutize the offline style against its own url before handing it over
		const style = await this._load_offline_style( USE_STYLE )
		this.map = new maplibregl.Map({
	    	container: this.DOM.map,
	    	style,
	    	center,
	    	zoom,
	    	maxBounds,
	    	attributionControl,
	    });

	    // a layer can be selected before the style finishes loading;
	    // replay the pending prefs once the style is ready
	    this.map.on('load', () => this.__apply_pending_base_layers({caller: 'load'}) )
	    this.map.on('styledata', () => this.__apply_pending_base_layers({caller: 'styledata'}) )

	    return this.map;

	} // init

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
		this.DOM.toolbox.name.addEventListener('click', e => {
			wrap.classList.toggle('toggled')
		})

	} // init toolbox

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

	async _load_offline_style( url ){
		const res = await fetch( url )
		if( !res.ok ) throw new Error('failed to load style ' + url + ': ' + res.status )
		const style = await res.json()
		const base = res.url || ( window.location.origin + url )
		// new URL() percent-encodes {tokens}; restore the maplibre ones afterwards
		console.log('LAYERS load-offline-styles', {
			url,
			base,
		})
		const absolutize = u => new URL( u, base ).href.replace( /%7B/gi, '{' ).replace( /%7D/gi, '}' )
		if( style.glyphs ) style.glyphs = absolutize( style.glyphs )
		for( const key in ( style.sources || {} ) ){
			const src = style.sources[ key ]
			if( Array.isArray( src.tiles ) ) src.tiles = src.tiles.map( absolutize )
			if( src.url ) src.url = absolutize( src.url )
		}
		return style
	}

	pop_edit_layer( args ){
		const {
			extant_row,
			extant_data,
			is_edit,
			MapView,
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

		const _layer = new MapView( extant_data )
		_layer.extant_row = extant_row
		_layer.mappa = this
		const form = _layer.build_edit_form()
		modal.left_panel.append( form )

		document.body.append( modal.ele )

		BROKER.publish('MAKE_DRAGGABLE', {
			ele: modal.content,
			storage_key: 'mappa-edit-layer',
		})

	} // pop edit layer

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
			MapView,
			nav,
		} = args || {}

		const create_btn = nav.querySelector('#add-layer')
		const find_btn = nav.querySelector('#find-layer')

		create_btn.addEventListener('click', e => {
			this.pop_edit_layer({
				MapView,
			})
		})

		find_btn.addEventListener('click', e => {
			console.log('find')
		})

	} // bind nav


	async refresh_layers( args ){
		const {
			MapView,
			type,
			silent,
		} = args

		let res, action, container

		switch( type ){

		case 'user':
			action = 'get_user_layers'
			container = this.DOM.user_list
			break;

		case 'others':
			action = 'get_other_layers'
			container = this.DOM.other_list
			break;

		default:
			return console.warn('unknown refresh type', type )
		}

		res = await fetch_wrap('/action_main', 'post', {
			action,
		}, true )

		if( !res?.success ) return silent || hal('error', res?.msg || 'error getting layers', 5000 )

		for( const layer of res.results || [] ){
			const extant = container.querySelector('.mappa-row[data-layer-uuid="' + layer.uuid + '"]')
			if( extant ) continue;
			const _layer = new MapView( layer )
			_layer.mappa = this
			const _new = _layer.build_row({
				data: layer,
			})
			container.append( _new )
		}

	} // refresh-layers


	set_mapview_active = async( event ) => {
		const {
			mapview,
		} = event

		if( event.layer ) throw new Error('stop doing this')

		console.log('LAYERS set-mappa-active', {
			mapview,
		})

		const {
			uuid,
			name,
			listed,
			locked,
			mappa, // ( should be this )
		} = mapview

		if( !this.DOM.toolbox.wrap.parent ){
			document.body.append( this.DOM.toolbox.wrap )
		}

		this.DOM.toolbox.name.innerText = name

		this.DOM.toolbox.content.innerHTML = ''

		this.fill_toolbox({
			mapview,
		})
		.then( res => {
			if( env.SPOOF.INIT_TOOLBOX ){
				this.DOM.toolbox.toggle.click()
			}
		})
		.catch( err => {
			console.error( 'err fill toolbox', err )
		})

		this.active_mapview = uuid

		localStorage.setItem( this.active_field, uuid )

		this.apply_base_layers( mapview, 'set-layer-active' )

	} // set mappa active


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
			document.body.remove( img_cursor )
			return;
		}

		let url
		if( tool_data.is_custom ){
			// 
		}else{
			img_cursor.querySelector('img').src = `/resource/tools/${tool_data.slug}.png`
		}

		document.body.append( img_cursor )

		document.body.classList.add('dragging')

		document.addEventListener('mousemove', move_img_cursor )
		document.addEventListener('click', unset_img_cursor )

	} // set cursor



	apply_base_layers( mapview, caller ){
		/*
			update the map with the active mapview's saved base-layer prefs
			defers if the style isn't loaded yet — replayed on load/styledata.
		*/
		// validate props
		if( !mapview || !this.map ) return false
		// validate async
		if( typeof this.map.isStyleLoaded === 'function' && !this.map.isStyleLoaded() ){
			this._pending_base_mapview = mapview
			return false
		}
		this._pending_base_mapview = undefined
		// log
		console.log('LAYERS apply-base-layers', {
			mapview,
			caller,
		})
		// the apply
		for( const g of BASE_LAYER_GROUPS ){
			const raw = mapview[ 'layer_' + g.id ] // layer_ = my db mapping prefix
			const visible = ( raw === undefined || raw === null ) ? true : !!raw

			setBaseLayerVisible({
				map: this.map,
				groupOrId: g.id, 
				visible, 
				caller: 'apply-base-layers'
			})

		}

		return true

	}



	__apply_pending_base_layers( args ){
		/*
			purely an async patch
			all business logic in apply-base-layers
		*/
		const {
			caller,
		} = args || {}
		if( this._pending_base_mapview && this.map?.isStyleLoaded?.() ){
			console.log('LAYERS apply-pending-base-layers', {
				pending: this._pending_base_mapview,
				caller,
			})
			const mapview = this._pending_base_mapview
			this._pending_base_mapview = undefined
			this.apply_base_layers( mapview, 'apply-pending' )
		}
	}



	async fill_toolbox( args ){
		const {
			mapview,
		} = args

		this.DOM.toolbox.content.innerText = ''

		let res = await fetch_wrap('/action_main', 'post', {
			action: 'get_toolbox',
			mapview_uuid: mapview.uuid,
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
	img.src = `/fs/tools/${data.img_slug}.png`
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
document.body.append( img_cursor ) // shows only on classlist drag ging

const move_img_cursor = e => {
	img_cursor.style.top = e.clientY + 'px'
	img_cursor.style.left = e.clientX + 'px'
}

const unset_img_cursor = e => {
	window.removeEventListener('mousemove', move_img_cursor )
	// img_cursor.style.display = 'none'
	document.body.remove( img_cursor )
}









export default Mappa