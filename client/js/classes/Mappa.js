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
import IconLayer from './IconLayer.js'
import { xhr_piece } from '../file_handler.js'




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
		this._pending_base_mapview = undefined

		this.active_field = 'mappa-active-layer'
		this.tools_by_uuid = {}
		this.icons = null
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

	    this.map.on('click', on_map_click )

	    this.icons = new IconLayer( this.map, {
	    	on_icon_click: entry => this.pop_icon_info( entry ),
	    } )
	    this.map.on('styledata', () => this.icons?.resync?.() )

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

		const _view = new MapView( extant_data )
		_view.extant_row = extant_row
		_view.mappa = this
		const form = _view.build_edit_form()
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

		this.uuid = uuid

		this.DOM.toolbox.name.innerText = name

		this.DOM.toolbox.content.innerHTML = ''

		localStorage.setItem( this.active_field, uuid )

		this.apply_base_layers( mapview, 'set-layer-active' )

		// reset per-layer element state
		this.icons?.clear()
		this.tools_by_uuid = {}

		// fill tools first so items can resolve their icon immediately
		let res = await this.fill_toolbox({
			mapview,
		})
		// fill items
		res = await this.fill_map_items()
		if( env.SPOOF.INIT_TOOLBOX ){
			this.DOM.toolbox.toggle.click()
		}

	} // set mappa active


	async fill_map_items(){
		let res = await fetch_wrap('/action_main', 'post', {
			action: 'get_map_items',
			mapview_uuid: this.uuid,
		})
		if( !res?.success ) return hal('error', res?.msg || 'error fill items', 5000 )

		await this.icons?.render_all( res.results || [], item => this._resolve_item_tool( item ) )

		console.log('fill-map-items', res )

	}


	set_map_item( args ){
		const {
			item,
			mapview_uuid,
			MapElement,
		} = args
		if( this.uuid !== mapview_uuid ) return console.warn('invalid map uuid')

		const element = new MapElement( item )

		console.log('set-map-item', {
			item,
			geojson: item.geojson,
			mapview_uuid,
			MapElement,
		})

		const tool = this._resolve_item_tool( item )
		if( !tool ) return console.warn('skipping element, unknown tool', item?.uuid )
		this.icons?.upsert( item, tool )

	}

	_resolve_item_tool( item ){
		if( item?.tool?.uuid && this.tools_by_uuid[ item.tool.uuid ] ){
			return this.tools_by_uuid[ item.tool.uuid ]
		}
		if( item?.tool_uuid && this.tools_by_uuid[ item.tool_uuid ] ){
			return this.tools_by_uuid[ item.tool_uuid ]
		}
		// server now embeds tool directly; fall back to that if toolbox hasn't loaded it
		if( item?.tool?.uuid && item?.tool?.img_slug ){
			return item.tool
		}
		if( item?.tool_uuid && item?.img_slug ){
			return { uuid: item.tool_uuid, img_slug: item.img_slug }
		}
		return false
	}

	pop_icon_info( entry ){
		const {
			item,
			tool,
		} = entry || {}

		const modal = new Modal({
			type: 'icon-info',
			header: tool?.name || item?.name || 'icon',
		})

		if( tool?.img_slug ){
			const img = lib.b('img', false, 'icon-info-img')
			img.src = `/fs/thumbs/${lib.get_subdir({ slug: tool.img_slug })}/${tool.img_slug}`
			modal.content.append( img )
		}

		const rows = []
		if( tool?.slug ) rows.push([ 'type', tool.slug ])
		if( Array.isArray( item?.geojson?.coordinates ) ){
			const [ lng, lat ] = item.geojson.coordinates
			rows.push([ 'location', `${Number( lat ).toFixed(5)}, ${Number( lng ).toFixed(5)}` ])
		}
		if( item?.created ) rows.push([ 'placed', new Date( item.created ).toLocaleString() ])

		for( const [ label, value ] of rows ){
			const row = lib.b('div', false, 'icon-info-row')
			const _label = lib.b('label')
			_label.innerText = label
			row.append( _label )
			const _value = lib.b('div', false, 'value')
			_value.innerText = value
			row.append( _value )
			modal.content.append( row )
		}

		document.body.append( modal.ele )

	}

	set_tool_active = async( event ) => {
		const {
			wrap,
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

		if( !state || !tool_data ){
			window.removeEventListener('mousemove', move_img_cursor )
			window.removeEventListener('click', unset_img_cursor )
			document.body.classList.remove('dragging')
			document.body.remove( IMG_CURSOR )
			return;
		}

		IMG_CURSOR.querySelector('img').src = `/fs/thumbs/${lib.get_subdir({ slug: tool_data.img_slug })}/${tool_data.img_slug}`
		IMG_CURSOR.setAttribute('data-tool-uuid', tool_data.uuid )
		IMG_CURSOR.setAttribute('data-mappa-uuid', this.uuid )

		document.body.append( IMG_CURSOR )
		document.body.classList.add('dragging')

		window.addEventListener('mousemove', move_img_cursor )

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

		for( const tool_data of res.results || [] ){
			this.tools_by_uuid[ tool_data.uuid ] = tool_data
			const tool = build_tool({
				mappa: this,
				tool_data,
			})
			this.DOM.toolbox.content.append( tool )
		}

		const {
			wrap,
			liner,
		} = _build_tool_wrap()

		const add_tool = lib.b('div', false, 'button', 'add-tool')
		add_tool.innerHTML = '+'
		add_tool.addEventListener('click', add_tool_modal )
		liner.append( add_tool )

		this.DOM.toolbox.content.append( wrap )

		MAP.set( add_tool, {
			mapview: this,
		})

	} // fill toolbox


} // Mappa




const add_tool_modal = e => {
	const btn = lib.click_parent( e.target, 'add-tool', false, 5 )

	const {
		mapview,
	} = MAP.get( btn )

	const modal = new Modal({
		type: 'add-tool-pop',
		header: 'add icon',
	})

	const expl = lib.b('div', false, 'expl')
	expl.innerText = `An icon is just an image and a type.  You can add specific details to each one you place on the map.`
	modal.content.append( expl )

	const set_img = lib.b('div', false, 'choose-image')
	const _img = lib.b('input', false, 'input')
	_img.type = 'file'
	set_img.append( _img )
	modal.content.append( set_img )

	const set_type = lib.b('div', false, 'choose-name')
	const _type = lib.b('input', false, 'input')
	_type.type = 'text'
	_type.placeholder = 'icon type, ex "store", "party"'
	modal.content.append( set_type )

	const save = lib.b('button', false, 'button', 'save')
	save.innerHTML = 'save'
	save.addEventListener('click', save_icon )
	modal.content.append( lib.b('br') )
	modal.content.append( save )

	document.body.append( modal.ele )

	MAP.set( save, {
		input_img: _img,
		input_type: _type,
		mapview,
	})

} // add tool modal


const save_icon = async( e ) => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )

	const {
		input_img,
		input_type,
		mapview,
	} = MAP.get( btn )

	let res = await xhr_piece({
		file: input_img.files[0],
		data: {
			title: input_type.value.trim(),
		},
		hide_spinner: false,
	})
	if( !res?.success ) return hal('error', res?.msg || 'error uploading', 5000 )

	res = await fetch_wrap('/action_main', 'post', {
		action: 'save_tool_icon',
		mapview_uuid: mapview.uuid,
		type: input_type.value.trim(),
		media_slug: res.item?.slug,
	})
	if( !res?.success ) return hal('error', res?.msg || 'error creating tool', 5000 )

	hal('success', 'saved icon', 3000 )

} // save icon




const _build_tool_wrap = () => {
	const wrap = lib.b('div', false, 'tool-wrap', 'ib')
	const liner = lib.b('div', false, 'tool-liner', 'flex-wrapper')
	wrap.append( liner )
	return {
		wrap,
		liner,
	}
}



const build_tool = args => {
	const {
		mappa,
		tool_data,
	} = args

	const {
		wrap,
		liner
	} = _build_tool_wrap()

	const img = lib.b('img')
	img.src = `/fs/thumbs/${lib.get_subdir({ slug: tool_data.img_slug })}/${tool_data.img_slug}`
	liner.append( img )

	MAP.set( wrap, {
		mappa,
		tool_data,
	})

	wrap.addEventListener('click', set_active_tool )

	return wrap

} // build tool



const set_active_tool = e => {
	const wrap = lib.click_parent( e.target, 'tool-wrap', false, 5 )
	const {
		tool_data,
	} = MAP.get( wrap )

	BROKER.publish('MAPPA_SET_TOOL', {
		tool_data,
		wrap,
	})

}



let IMG_CURSOR = lib.b('div', 'img-cursor')
if( env.EXPOSE ){
	window.IMG_CURSOR = IMG_CURSOR
}
const liner = lib.b('div', false, 'flex-wrapper')
IMG_CURSOR.append( liner )
const _img = lib.b('img')
liner.append( _img )
document.body.append( IMG_CURSOR ) // shows only on classlist drag ging

const move_img_cursor = e => {
	IMG_CURSOR.style.top = e.clientY + 'px'
	IMG_CURSOR.style.left = e.clientX + 'px'
}

const unset_img_cursor = e => {
	window.removeEventListener('mousemove', move_img_cursor )
	window.removeEventListener('click', unset_img_cursor )
	IMG_CURSOR.removeAttribute('data-tool-uuid')
	IMG_CURSOR.removeAttribute('data-mappa-uuid')
	IMG_CURSOR.remove()
}

const on_map_click = ( Nt ) => {
	const {
		lngLat,
		originalEvent,
		point,
		target,
		type,
	} = Nt

	const {
		x,y
	} = point

	const {
		clientX, clientY
	} = originalEvent

	const {
		lat, lng
	} = lngLat

	if( document.body.classList.contains('dragging') ){

		// icon clicks open info instead of placing
		if( window.mappa?.icons?.hit_test( point ) ) return

		place_icon({
			lat,
			lng,
		})

	}else{

		//

	}

	setTimeout(()=>{
		unset_img_cursor()
	}, 100)

	console.log('on-map-click', {
		lat, lng
	})

} // on map click



const place_icon = args => {
	const {
		lat,
		lng,
	} = args

	fetch_wrap('/action_main', 'post', {
		action: 'place_icon',
		icon_uuid: IMG_CURSOR.getAttribute('data-tool-uuid'),
		mapview_uuid: IMG_CURSOR.getAttribute('data-mappa-uuid'),
		lat,
		lng,
	})
	.then( res => {
		if( !res?.success ) return hal('error', res?.msg || 'error placing', 5000 )
		const {
			item,
		} = res

		hal('success', 'placed icon', 3000 )

		BROKER.publish('ADD_MAP_ITEM_DATA', {
			mapview_uuid: res.mapview_uuid,
			item,
		})

	})

} // place icon








export default Mappa