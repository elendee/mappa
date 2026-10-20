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
import Toolset from './Toolset.js'
import MapElement from './MapElement.js'
import MapView from './MapView.js'
import { xhr_piece } from '../file_handler.js'
import GLOBAL from '../GLOBAL.js'




const MAP = new Map()

const storage_keys = window.storage_keys = {
	// return_map: 'mappa-pending-join',
	edit_layer: 'mappa-edit-layer',
}

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
				set_name: lib.b('div', false, 'toolbox-set-name'),
				toggle: lib.b('div', false, 'toolbox-toggle'),
			},
			social_tab: {
				wrap: lib.b('div', 'social-tab'),
				link: lib.b('div', false, 'public-link'),
				save_wrap: lib.b('div', false, 'save-wrap'),
				save_btn: lib.b('div', false, 'button' ),
			}
		}
		this._init_toolbox()
		this._init_social_tab()

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
	    	on_icon_click: entry => this.pop_icon_info({
	    		...entry,
	    		is_owner: entry?.is_owner ?? entry?.item?.is_owner ?? this.is_owner,
	    	}),
	    } )
	    this.map.on('styledata', () => this.icons?.resync?.() )

	    return this.map;

	} // init

	_init_social_tab(){
		const {
			social_tab,
		} = this.DOM

		const {
			wrap,
			link,
			save_wrap,
			save_btn,
		} = social_tab

		wrap.style.display = 'none' // one-time set

		save_btn.innerText = lib.is_logged ? 'save map' : 'login to save map'
		save_btn.addEventListener('click', e => {
			if( !lib.is_logged ){
				document.querySelector('.menu-item.login').click()
				return;
			}
			fetch_wrap('/action_main', 'post', {
				action: 'save_map',
				mapview_uuid: this.uuid,
			})
			.then( res => {
				if( !res?.success ) return hal('error', res?.msg || 'error saving', 5000 )
				hal('success', 'success', 5000 )
				console.log('why unnamed..', res )
				const view = new MapView( res.mapview )
				const row = view.build_row({
					mappa: this,
					data: view,
				})
				this.DOM.other_list.prepend( row )
			})
		})

		wrap.append( link )
		save_wrap.append( save_btn )
		wrap.append( save_wrap )

		if( window.innerWidth < 800 ){

			this.DOM.panel.prepend( this.DOM.social_tab.wrap )

		}

	} // init social tab

	_init_toolbox(){
		const {
			toolbox
		} = this.DOM

		const {
			wrap,
			name,
			set_name,
			content,
			toggle,
		} = toolbox

		wrap.append( name )
		wrap.append( set_name )
		wrap.append( content )
		wrap.append( toggle )

		toggle.innerHTML = `<img src='/resource/icons/arrow.png'>`

		toggle.addEventListener('click', e => {
			wrap.classList.toggle('toggled')
		})
		this.DOM.toolbox.name.addEventListener('click', e => {
			wrap.classList.toggle('toggled')
		})
		this.DOM.toolbox.set_name.addEventListener('click', e => {
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


	pop_find_mapview(){
		const modal = new Modal({
			type: 'find-mapview',
		})

		const search_maps = async( e, scope_args, passed_args ) => {
			const {
				type,
			} = passed_args

			const input = e.target

			hal('success', 'searching ' + type, 2000 )

			let res = await fetch_wrap('/action_main', 'post', {
				action: 'search_maps',
				type,
				value: input.value.trim(),
			})
			if( !res?.success ) return hal('error', res?.msg || 'error searching', 5000 )

			console.log('search', res )

			results.innerHTML = ''
			for( const r of res.results || []){
				const view = new MapView( r )
				view.user = r.user
				const row = view.output_summary()
				const link = lib.b('a')
				link.href = `/?m=${view.uuid}`
				link.append( row )
				results.append( link )
			}

		} // search maps
		const debounced_map_search = lib.make_debounce( search_maps, 500, false, {})

		const build_search_box = args => {
			const {
				size,
				type,
				desc,
			} = args

			const _size = size || 2

			const wrap = lib.b('div', false, 'search-wrap', 'column', 'column-' + _size )
			const label = lib.b('label')
			label.innerText = `${desc||type}`
			wrap.append( label )
			const input = lib.b('input', false, 'input')
			input.placeholder = 'enter a value..'
			wrap.append( input )

			input.addEventListener('keyup', e => {
				debounced_map_search( e, {
					type,
				})
			})

			return wrap

		} // build search box

		// build nav
		const nav = lib.b('div', false, 'search-nav', 'row')
		const expl = lib.b('div', false, 'column')
		expl.innerText = `Search for public maps by either value.`
		nav.append( expl )
		modal.content.append( nav )
		const boxes = {
			name: build_search_box({ type: 'name', desc: 'Map name', size: 2 }),
			// user: build_search_box({ type: 'user' }),
			uuid: build_search_box({ type: 'id', desc: 'Map id (uuid)', size: 2 }),
		}
		for( const key in boxes ){
			const box = boxes[key]
			nav.append( box )
		}

		// results area
		const results = lib.b('div', false, 'results')
		modal.content.append( results )

		document.body.append( modal.ele )

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

		if( window.innerWidth > 800 ){
			const drag = lib.b('div', false, 'drag-icon')
			drag.innerHTML = `<img src='/resource/icons/drag.png'>`
			modal.content.prepend( drag )			
		}else{
			modal.content.prepend( modal.right_panel )
		}

		const selected = []
		for( const key in extant_data || {} ){
			if( key.match(/^layer_/) ){
				if( extant_data[ key] ) selected.push( key.replace('layer_', '') )
			}
		}

		const base_layers = lib.b('div', false, 'base-layer-wrap')
		const base_ele = this._build_base_ele({
			selected,
			extant_data,
		})
		base_layers.append( base_ele )
		modal.left_panel.append( base_layers )

		const _view = new MapView( extant_data )
		_view.can_edit = extant_data?.can_edit
		_view.is_owner = extant_data?.is_owner
		if( !extant_data ){ // new map defaults
			_view.listed = 1
		}
		const form = _view.build_edit_form({ // xyz
			mappa: this,
		})

		_view._post_save = ( args ) => {
			const {
				form,
				edit_args,
				res,
			} = args
			const {
				// extant_row,
			} = edit_args || {}
			const {
				success,
				model,
			} = res || {}

			if( extant_row ){
				const layer = new MapView( model )
				layer.can_edit = _view.can_edit
				layer.is_owner = _view.is_owner
				const new_row = layer.build_row({
					mappa,
					data: _view,
				})
				extant_row.parentElement.insertBefore( new_row, extant_row )
				extant_row.remove()
				const modal = lib.click_parent( form, 'modal', false, 10 )
				const close = modal ? modal.querySelector('.modal-close') : undefined
				if( close ) close.click()
			}else{
				console.warn('should have extant row for layer')
			}

			mappa.update_hud({
				mapview: _view,
				caller: 'pop-edit-layer'
			})

		} // post save
		modal.right_panel.append( form )

		// allow map uuid
		if( extant_data?.uuid ){

			const uuid = lib.b('div', false, 'mapview-uuid', 'ib')
			uuid.innerHTML = `map id: <pre class='ib'>${extant_data.uuid}</pre> link: <code class='ib'>${env.PUBLIC_URL}?m=${extant_data.uuid}</code>`
			const {
				btn,
			} = lib.gen_copy_button( uuid )
			uuid.append( btn )
			modal.content.append( uuid )

		}

		document.body.append( modal.ele )

		modal.ele.classList.add('clickthrough')

		if( window.innerWidth > 800 ){
			BROKER.publish('MAKE_DRAGGABLE', {
				ele: modal.content,
				storage_key: storage_keys.edit_layer,
			})			
		}


	} // pop edit layer

	_build_base_ele( args ){
		const {
			// extant_layer_data,
			extant_data,
			selected,
			onChange,
		} = args || {}

		return build_base_layer_form({
			// extant_layer_data,
			extant_data,
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
			const extant = document.querySelector('.modal.edit-layer')
			if( extant ){
				const close = extant.querySelector('.modal-close')
				if( close ){
					close.click()
					return
				}
			}
			this.pop_edit_layer({
				MapView,
			})
		})

		find_btn.addEventListener('click', e => {
			this.pop_find_mapview()
		})

	} // bind nav


	async refresh_mapviews( args ){
		const {
			MapView,
			type,
			silent,
			init_uuid,
		} = args

		// hal('standard', 'REFRESH-LAYERS ' + init_uuid )

		let res, action, container

		switch( type ){

		case 'user':
			action = 'get_user_maps'
			container = this.DOM.user_list
			break;

		case 'others':
			action = 'get_joined_maps'
			container = this.DOM.other_list
			break;

		default:
			return console.warn('unknown refresh type', type )
		}

		res = await fetch_wrap('/action_main', 'post', {
			action,
		}, true )

		if( !res?.success ){
			return silent || hal('error', res?.msg || 'error getting layers', 5000 )
		}

		console.log('REFRESH-LAYERS', {
			args,
			res,
		})


		let init_row
		for( const layer of res.results || [] ){
			const extant = container.querySelector('.mappa-row[data-layer-uuid="' + layer.uuid + '"]')
			if( extant ){
				console.warn('already got row', layer.uuid )
				continue;
			}
			const mapview = new MapView( layer )
			const _new = mapview.build_row({
				mappa: this,
				data: layer,
			})

			if( init_uuid === layer.uuid ){
				init_row = _new
			}
			container.append( _new )
		}

		if( init_row ){
			setTimeout(() => {
				init_row.click()
			}, 500 )
			return {
				init_uuid,
			}
		}
		return {
			//
		}

	} // refresh-layers


	set_mapview_active = async( event ) => {
		const {
			can_edit,
			mapview,
			is_owner,
			caller,
		} = event

		if( event.layer ) throw new Error('stop doing this')

		console.log('LAYERS set-mappa-active', {
			mapview,
			is_owner,
			caller,
		})

		const {
			uuid,
			name,
			listed,
			locked,
			mappa, // ( should be this )
		} = mapview

		if( is_owner || can_edit ){
			if( !this.DOM.toolbox.wrap.parent ){
				document.body.append( this.DOM.toolbox.wrap )
			}
		}else{
			this.DOM.toolbox.wrap.remove()
		}

		this.uuid = uuid
		// owner of the active layer gates the icon edit form in pop_icon_info;
		// prefer explicit event flag, fall back to the mapview pub
		this.is_owner = is_owner ?? mapview?.is_owner ?? false
		this.active_mapview = mapview

		this.DOM.toolbox.name.innerText = name

		this.DOM.toolbox.content.innerHTML = ''

		localStorage.setItem( this.active_field, uuid )

		this.apply_base_layers( mapview, 'set-layer-active' )

		// reset per-layer element state
		this.icons?.clear()
		this.tools_by_uuid = {}

		// fill tools first so items can resolve their icon immediately
		let res = await this.update_hud({
			mapview,
			caller: 'set-mappa-active',
		})

		// fill items
		res = await this.fill_map_items()

		if( env.SPOOF.INIT_TOOLBOX ){
			if( this.DOM.toolbox.wrap.classList.contains('toggled') ){

			}else{
				this.DOM.toolbox.wrap.classList.toggle('toggled')
				// toggle.click()
			}
		}

	} // set mappa active


	async fill_map_items(){
		let res = await fetch_wrap('/action_main', 'post', {
			action: 'get_map_items',
			mapview_uuid: this.uuid,
		})
		if( !res?.success ) return hal('error', res?.msg || 'error fill items', 5000 )

		console.log('fill-map-items', res )

		// layer-level ownership from server; per-item flag wins when present
		if( res.is_owner !== undefined ) this.is_owner = res.is_owner


		await this.icons?.render_all(
			res.results || [],
			item => this._resolve_item_tool( item ),
			item => item?.is_owner ?? res.is_owner ?? this.is_owner,
		)

	} // fill map items

	set_map_item( args ){
		const {
			item,
			mapview_uuid,
			MapElement: MapElementArg,
			is_owner,
		} = args
		if( this.uuid !== mapview_uuid ) return console.warn('invalid map uuid')

		const ElementClass = MapElementArg || MapElement
		const element = new ElementClass( item )

		console.log('set-map-item', {
			item,
			geojson: item.geojson,
			mapview_uuid,
			MapElement: ElementClass,
		})

		const tool = this._resolve_item_tool( item )
		if( !tool ) return console.warn('skipping element, unknown tool', item?.uuid )
		this.icons?.upsert( item, tool, is_owner ?? item?.is_owner ?? this.is_owner )

	} // set map item

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
			return { 
				uuid: item.tool_uuid, 
				img_slug: item.img_slug 
			}
		}
		return false

	} // resolve item tool

	pop_icon_info( entry ){
		const {
			item,
			tool,
			is_owner: entry_owner,
		} = entry || {}

		// ownership threads: IconLayer entry -> item pub -> active layer fallback
		const is_owner = entry_owner ?? item?.is_owner ?? this.is_owner ?? false

		const modal = new Modal({
			type: 'icon-info',
			header: item?.name || 'icon',
		})

		if( tool?.img_slug ){
			const img = lib.b('img', false, 'icon-info-img')
			img.src = `/fs/thumbs/${lib.get_subdir({ slug: tool.img_slug })}/${tool.img_slug}`
			modal.content.append( img )
		}

		const rows = []
		// if( item?.name ) rows.push([ 'name', item.name ])
		const _tool = tool ?? item?.tool
		if( _tool?.type ) rows.push([ 'type', _tool.type ])
		if( Array.isArray( item?.geojson?.coordinates ) ){
			const [ lng, lat ] = item.geojson.coordinates
			rows.push([ 'location', `${Number( lat ).toFixed(5)}, ${Number( lng ).toFixed(5)}` ])
		}
		if( item?.created ) rows.push([ 'placed', new Date( item.created ).toLocaleString() ])

		for( const [ label, value ] of rows ){
			const row = lib.b('div', false, 'icon-info-row')
			const _value = lib.b('div', false, 'value')
			_value.innerHTML = `<b>${label}</b>: ${value}`
			row.append( _value )
			modal.content.append( row )
		}

		if( is_owner && item ){
			const move_btn = lib.b('button', false, 'button', 'move-icon')
			move_btn.innerText = 'move icon'
			move_btn.addEventListener('click', () => {
				const _tool = tool || this._resolve_item_tool( item )
				if( !_tool ) return hal('error', 'cannot move: unknown icon type', 5000 )
				modal.close.click()
				hal('success', 'click map to move icon', 5000 )
				this.set_cursor({
					state: true,
					tool_data: _tool,
				})
				IMG_CURSOR.setAttribute('data-element-uuid', item.uuid )
			})
			modal.content.append( move_btn )

			const rm_btn = lib.b('button', false, 'button', 'rm')
			rm_btn.innerText = 'remove'
			rm_btn.addEventListener('click', remove_icon )
			modal.content.append( rm_btn )
			MAP.set( rm_btn, {
				modal,
				mappa: this,
				item,
			})
			// stringify json fields so the generic form shows editable text, not [object Object]
			const element = new MapElement({
				...item,
				data: typeof item.data === 'object' ? JSON.stringify( item.data ) : item.data,
				geojson: typeof item.geojson === 'object' ? JSON.stringify( item.geojson ) : item.geojson,
			})
			// element.mappa = this
			// keep the rendered icon in sync after an edit save
			element._post_save = ({ res }) => {
				if( res?.model ){
					const updated = {
						...item,
						...res.model,
					}
					const _tool = this._resolve_item_tool( updated ) || tool
					if( _tool ) this.icons?.upsert( updated, _tool, is_owner )
				}
				// modal.close.click()
			}
			const form = element.build_edit_form() // xyz
			// location is fixed by placement; don't hand-edit raw geojson
			form.querySelector('.model-detail-geojson')?.remove()
			modal.content.append( form )

			modal.ele.classList.add('clickthrough')

			if( window.innerWidth > 800 ){
				BROKER.publish('MAKE_DRAGGABLE', {
					ele: modal.content,
					storage_key: 'mappa-edit-icon',
				})
			}

		}

		document.body.append( modal.ele )

	} // pop icon info

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

		this.set_cursor({
			state: true,
			tool_data,
		})

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
	} // --apply pending base layers


	get_toolset_icon_src( args ){
		const {
			toolset,
		} = args

		const _toolset = toolset || this.toolset

		const stamp = _toolset?.img_slug?.split('_')[0]
		if( stamp ){
			 return `/fs/toolsets/${lib.get_subdir(stamp)}/${_toolset.img_slug}`
		}else{
			return `/resource/media/pin.png`
		}

	} // get toolset icon src


	build_toolset_preview( args ){
		const {
			toolset,
		} = args

		const preview = lib.b('div', false, 'icon-preview')

		const preview_img = lib.b('img', false, 'icon-preview-img')
		preview_img.src = this.get_toolset_icon_src({
			toolset,
		}) 
		preview.append( preview_img )

		const preview_name = lib.b('div', false, 'icon-preview-name')
		preview_name.innerText = toolset?.name || '-'
		preview.append( preview_name )

		return {
			preview,
			preview_img,
			preview_name,
		}

	} // build toolset preview


	build_tool_picker( args ){
		const {
			toolset,
		} = args

		const wrap = lib.b('div', false, 'icon-preview-wrap')

		const {
			preview,
			preview_img,
			preview_name,
		} = this.build_toolset_preview({
			toolset,
		})

		wrap.append( preview )

		const pick_set = lib.b('div', false, 'button', 'pick-toolset')
		pick_set.innerText = 'Choose Icons'
		pick_set.addEventListener('click', choose_tools )
		wrap.append( pick_set )

		MAP.set( pick_set, {
			wrap,
			preview,
			preview_img,
			preview_name,
			mappa: this,
		})

		return wrap

	} // build tool picker


	async fill_social_tab( args ){
		const {
			mapview,
		} = args

		console.log('fill-share', args )

		const {
			wrap,
			link,
			save_wrap,
			save_btn,
		} = this.DOM.social_tab

		if( !wrap.parentElement ){
			document.body.append( wrap )
		}

		wrap.style.display = 'inline-block' // one-time

		// public link
		let status
		if( mapview.hidden ){
			status = 'disabled to anyone but editors'
		}else if( !mapview.listed ){
			status = 'view-able but not listed'
		}else{
			status = 'public'
		}
		link.innerHTML = `
		<div class='map-name'><b>${this.active_mapview?.name}</b></div>
		<div class='status'>Map is ${status}</div>
		<code>${env.PUBLIC_URL}?m=${this.uuid}</code>`
		const {
			btn,
		} = lib.gen_copy_button( link )
		link.append( btn )

		// join button
		let extant_row = this.DOM.user_list.querySelector(`.mappa-row[data-layer-uuid='${this.uuid}']`)
		if( !extant_row ){
			extant_row = this.DOM.other_list.querySelector(`.mappa-row[data-layer-uuid='${this.uuid}']`)
		}
		if( extant_row ){
			save_wrap.style.display = 'none'
		}else{
			save_wrap.style.display = 'inline-block'
		}

	} // fill social tab


	async update_hud( args ){
		const {
			mapview,
			caller,
		} = args

		await mappa.fill_toolbox({
			mapview,
			caller
		})

		await this.fill_social_tab({
			mapview,
			caller,
		})

	} // update hud


	async fill_toolbox( args ){
		const {
			mapview,
			caller,
		} = args

		console.log('fill-toolbox', {
			caller,
		})

		this.DOM.toolbox.content.innerText = ''

		let res = await fetch_wrap('/action_main', 'post', {
			action: 'get_view_toolset',
			mapview_uuid: mapview.uuid,
		})

		console.log('get-toolbox', {
			res,
		})

		if( !res?.success ){
			return hal('error', res?.msg || 'error filling style', 5000 )
		}else{
			//
		}

		const {
			toolset,
		} = res

		this.toolset = toolset

		const {
			created,
			edited,
			is_public,
			name,
			tools
		} = toolset || {}

		this.DOM.toolbox.set_name.innerText = name || 'unnamed'
		this.DOM.toolbox.wrap.setAttribute('data-active-set', this.toolset?.uuid )

		const has_toolset = toolset?.uuid
		if( !has_toolset ){

			// button to initialize toolset for mappa:

			const pick_set = mappa.build_tool_picker({
				toolset,
			})
			this.DOM.toolbox.content.append( pick_set )
			this.DOM.toolbox.wrap.classList.add('is-picker')

			return;

		}else{

			// fill existing tools:
			this.DOM.toolbox.wrap.classList.remove('is-picker')

			for( const tool_data of tools || [] ){
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

			wrap.classList.add('add-tool-wrap')

			const add_tool = lib.b('div', false, 'button', 'add-tool')
			add_tool.innerHTML = '+'
			add_tool.addEventListener('click', add_tool_modal )
			liner.append( add_tool )

			this.DOM.toolbox.content.append( wrap )

			MAP.set( add_tool, {
				mapview: this,
			})

			return {
				wrap,
				liner,
			}

		}

	} // fill toolbox


} // Mappa






const choose_tools = e => {
	
	const btn = lib.click_parent( e.target, 'button', false, 5 )

	const modal = new Modal({
		type: 'choose-tools',
		header: 'Choose icon set'
	})

	const {
		wrap: preview_wrap,
		preview: og_preview,
		preview_img: og_preview_img,
		preview_name: og_preview_name,
		mappa,
	} = MAP.get( btn )

	modal.make_columns()

	// create new
	const _create = lib.b('div', false, 'create-wrap')
	const label = lib.b('label')
	label.innerText = 'Create New Icon Set'
	_create.append( label )

	const set = new Toolset()

	set._post_save = async( e ) => {
		modal.close.click()
		await lib.sleep(100)
		btn.click()
	}

	const form = set.build_edit_form() // xyz
	_create.append( form )

	modal.right_panel.append( _create )

	// get available
	const expl_avl = lib.b('div', false, 'avbl-sets')
	expl_avl.innerText = `Choose from existing sets:`
	modal.left_panel.append( expl_avl )

	const extant_sets = lib.b('div', false, 'extant-sets')
	modal.left_panel.append( extant_sets )

	const sect_user = lib.build_result_section({
		type: 'blocks',
		label: 'your sets',
	})
	const sect_other = lib.build_result_section({
		type: 'blocks',
		label: 'other sets',
	})

	modal.left_panel.append( sect_user.wrap )
	modal.left_panel.append( sect_other.wrap )

	fetch_wrap('/action_main', 'post', {
		action: 'get_all_toolsets',
	}, false, modal.left_panel )
	.then( res => {

		if( !res?.success ) return hal('error', res?.msg || 'error getting tools', 5000 )

		for( const key in res.results_obj ){

			const set = res.results_obj[key]

			for( const r of set ){

				const wrap = lib.b('div', false, 'toolset', 'ib')
				wrap.setAttribute('data-uuid', r.uuid )

				const {
					preview,
					preview_img,
					preview_name,
				} = mappa.build_toolset_preview({
					toolset: r,
				})
				wrap.append( preview )
				wrap.addEventListener('click', set_toolset )

				if( key == 'user_sets' ){
					sect_user.content.append( wrap )
				}else if( key == 'other_sets' ){
					sect_other.content.append( wrap )
				}				

				MAP.set( wrap, {
					og_preview,
					og_preview_img,
					og_preview_name,
					preview_wrap: wrap,
					preview,
					preview_img,
					preview_name,
					mappa,
				})
			}

		}

	})

	document.body.append( modal.ele )

} // choose tools





const set_toolset = e => {
	const wrap = lib.click_parent( e.target, 'toolset', false, 5 )
	const modal = lib.click_parent( wrap, 'modal', false, 10 )
	const close = modal.querySelector('.modal-close')
	const {
		mappa,
		og_preview,
		og_preview_img,
		og_preview_name,
		preview_wrap,
		preview_img,
		preview_name,
		preview,
	} = MAP.get( wrap )

	const uuid = wrap.getAttribute('data-uuid')

	fetch_wrap('/action_main', 'post', {
		action: 'set_toolset',
		uuid,
		mapview_uuid: mappa.uuid,
	})
	.then( async( res ) => {

		if( !res?.success ) return hal('error', res?.msg || 'error setting', 5000 )

		hal('success', 'saved toolset', 5000 )

		if( modal.parentElement ){
			close.click()
		}
		// update state
		mappa.toolset = res.toolset

		// update the origin toolset
		og_preview_img.src = mappa.get_toolset_icon_src({
			toolset: mappa.toolset,
		})
		og_preview_name.innerText = mappa.toolset.name

		// update toolbox
		await mappa.update_hud({
			mapview: mappa.active_mapview,
			caller: 'set-toolset',
		})

	})

} // set toolset




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
	expl.innerText = `An icon is just an image and a label for your toolbox that you can re-use.`
	modal.content.append( expl )

	const set_img = lib.b('div', false, 'choose-image')
	const _img = lib.b('input', false, 'input')
	_img.type = 'file'
	set_img.append( _img )
	modal.content.append( set_img )

	modal.content.append( lib.spacer(30) )

	const select = lib.b('select', false, 'input')
	modal.content.append( select )
	const options = GLOBAL.ELEMENT_TYPES
	for( const key in options ){
		const option = lib.b('option')
		option.innerText = options[key]
		option.value = key
		select.append( option )
	}

	modal.content.append( lib.spacer(30) )

	const save = lib.b('button', false, 'button', 'save')
	save.innerHTML = 'save'
	save.addEventListener('click', save_icon )
	modal.content.append( lib.b('br') )
	modal.content.append( save )

	document.body.append( modal.ele )

	MAP.set( save, {
		modal,
		input_img: _img,
		type: select.value,
		name: '',
		mapview,
	})

} // add tool modal




const save_icon = async( e ) => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )

	const {
		modal,
		input_img,
		// input_type,
		type,
		name,
		mapview,
	} = MAP.get( btn )

	if( !type ) return hal('error', 'must choose a type', 5000 )

	let res = await xhr_piece({
		file: input_img.files[0],
		// data: {
		// 	title: input_type.value.trim(),
		// },
		hide_spinner: false,
	})
	if( !res?.success ) return hal('error', res?.msg || 'error uploading', 5000 )

	res = await fetch_wrap('/action_main', 'post', {
		action: 'save_tool_icon',
		mapview_uuid: mapview.uuid,
		type, //: input_type.value.trim(),
		name,
		media_slug: res.item?.slug,
	})
	if( !res?.success ) return hal('error', res?.msg || 'error creating tool', 5000 )

	const tool_data = res.tool
	if( tool_data ){
		mapview.tools_by_uuid[ tool_data.uuid ] = tool_data
		const tool = build_tool({
			mappa: mapview,
			tool_data,
		})
		const content = mapview.DOM?.toolbox?.content
		if( content ){
			if( content.lastElementChild ) content.lastElementChild.before( tool )
			else content.append( tool )
		}
	}

	modal.close.click()

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

} // set active tool





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
	IMG_CURSOR.removeAttribute('data-element-uuid')
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
		if( window.mappa?.icons?.hit_test( point ) ) return;

		if( IMG_CURSOR.getAttribute('data-element-uuid') ){
			move_icon({
				lat,
				lng,
			})
		}else{
			place_icon({
				lat,
				lng,
			})
		}

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



const move_icon = args => {
	const {
		lat,
		lng,
	} = args

	fetch_wrap('/action_main', 'post', {
		action: 'update_location',
		element_uuid: IMG_CURSOR.getAttribute('data-element-uuid'),
		mapview_uuid: IMG_CURSOR.getAttribute('data-mappa-uuid'),
		lat,
		lng,
	})
	.then( res => {
		if( !res?.success ) return hal('error', res?.msg || 'error moving', 5000 )
		const {
			item,
		} = res

		hal('success', 'moved icon', 3000 )

		BROKER.publish('ADD_MAP_ITEM_DATA', {
			mapview_uuid: res.mapview_uuid,
			item,
		})

	})

} // move icon


const remove_icon = e => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )
	const {
		modal,
		item,
		mappa,
	} = MAP.get( btn )

	console.log('rm', {
		item,
		mappa,
	})

	if( !confirm('Permanently remove ' + (item.name || 'item') + '?' ) ){
		return;
	}

	fetch_wrap('/action_main', 'post', {
		action: 'remove_icon',
		uuid: item.uuid,
		mapview_uuid: mappa.uuid,
	})
	.then( res => {
		if( !res?.success ) return hal('error', res?.msg || 'error removing', 5000 )

		mappa.icons?.remove( item.uuid )

		modal.close.click()

	})

}







export default Mappa