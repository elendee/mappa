import env from '../env.js'
import * as lib from '../lib.js'


/*
	owns all maplibre icon plumbing for placed elements:
	- geojson source + symbol layer
	- per-tool image registry (with inflight dedup so concurrent
	  renders sharing a tool don't race addImage)
	- style readiness (awaits a single load promise)

	Mappa keeps fetch/toolbox/layer orchestration and delegates here.
*/


class IconLayer {
	constructor( map, args ){
		const {
			source_id = 'mappa-elements',
			layer_id = 'mappa-elements-icons',
			on_icon_click,
		} = args || {}

		this.map = map
		this.source_id = source_id
		this.layer_id = layer_id
		this.on_icon_click = on_icon_click

		this._features = new Map()
		this._items = new Map() // element_uuid -> { item, tool }
		this._image_slugs = new Map() // image_name -> img_slug (for style-reload re-add)
		this._image_promises = new Map() // image_name -> inflight load promise
		this._ready = null
		this._click_bound = false
		this._map_loaded = false
		if( this.map && typeof this.map.once === 'function' ){
			this.map.once('load', () => { this._map_loaded = true })
		}
	}

	clear(){
		this._features.clear()
		this._items.clear()
		this._image_slugs.clear()
		this._image_promises.clear()
		this._ready = null
		this.commit()
	}

	resync(){
		// style reloads wipe sources + images; rebuild from retained state
		if( !this._features.size ) return
		this._image_promises.clear()
		this._ensure_layer()
		const loads = []
		for( const [ name, img_slug ] of this._image_slugs ){
			loads.push( this._ensure_image( name, img_slug ) )
		}
		Promise.all( loads ).then(() => this.commit() )
	}

	async _map_ready(){
		if( !this.map ) return false
		if( typeof this.map.isStyleLoaded !== 'function' || this.map.isStyleLoaded() ){ this._map_loaded = true; return true }
		if( this._map_loaded ) return true
		await new Promise( resolve => this.map.once('load', resolve ) )
		this._map_loaded = true
		return true
	}

	_label_font(){
		// glyphs are served by the style's own font stack; the offline
		// styles bundle Inconsolata, CARTO's cloud glyph server does not
		const glyphs = this.map?.getStyle?.()?.glyphs || ''
		return glyphs.includes('basemaps.cartocdn.com') ? 'Open Sans Regular' : 'Inconsolata'
	}

	_ensure_layer(){
		if( this.map.getSource( this.source_id ) ) return
		this.map.addSource( this.source_id, {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [],
			},
		})
		this.map.addLayer({
			id: this.layer_id,
			type: 'symbol',
			source: this.source_id,
			layout: {
				'icon-image': ['get', 'icon'],
				'icon-size': 0.45,
				'icon-allow-overlap': true,
				'text-field': ['get', 'label'],
				'text-font': [ this._label_font() ],
				'text-size': 18,
				'text-anchor': 'top',
				'text-offset': [0, 1],
				'text-max-width': 10,
				'text-line-height': 1.1,
				'text-padding': 4,
			},
			paint: {
				'text-color': '#222',
				'text-halo-color': '#fff',
				'text-halo-width': 1.5,
			},
		})
		this._bind_click()
	}

	_bind_click(){
		if( this._click_bound ) return
		this._click_bound = true
		this.map.on('click', this.layer_id, e => {
			const hit = e.features?.[0]
			if( !hit ) return
			const entry = this._items.get( hit.properties?.element_uuid )
			if( !entry ) return
			if( typeof this.on_icon_click === 'function' ) this.on_icon_click( entry )
		})
		this.map.on('mouseenter', this.layer_id, () => {
			this.map.getCanvas().style.cursor = 'pointer'
		})
		this.map.on('mouseleave', this.layer_id, () => {
			this.map.getCanvas().style.cursor = ''
		})
	}

	hit_test( point ){
		// true if an icon is rendered at the given map click point
		// (lets the placement handler skip clicks meant for icons)
		if( !this.map?.queryRenderedFeatures ) return false
		const hits = this.map.queryRenderedFeatures( point, { layers: [ this.layer_id ] } )
		return !!hits?.length
	}

	image_name( tool ){
		return `tool-${tool.uuid}`
	}

	_ensure_image( name, img_slug ){
		if( this.map.hasImage( name ) ) return Promise.resolve( true )
		if( !this._image_promises.has( name ) ){
			const url = `/fs/thumbs/${lib.get_subdir({ slug: img_slug })}/${img_slug}`
			const promise = this.map.loadImage( url ).then( image => {
				if( !this.map.hasImage( name ) ){
					this.map.addImage( name, image.data )
				}
				return true
			}).catch( err => {
				console.warn('icon image failed to load', url, err )
				this._image_promises.delete( name )
				return false
			})
			this._image_promises.set( name, promise )
		}
		return this._image_promises.get( name )
	}

	_stage( item, tool, is_owner ){
		// validate + stage feature; returns image name or false
		// is_owner rides along on the entry so Mappa.pop_icon_info can gate the edit form
		if( !item?.geojson ) return console.warn('map item missing geojson', item )
		if( item.geojson.type !== 'Point' ) return console.warn('only Point render supported', item.geojson )
		const coords = item.geojson.coordinates
		if( !Array.isArray( coords ) || typeof coords[0] !== 'number' || typeof coords[1] !== 'number' ){
			return console.warn('invalid Point coordinates', coords )
		}
		if( !tool?.uuid || !tool?.img_slug ) return console.warn('item missing tool image', item )

		const name = this.image_name( tool )
		this._image_slugs.set( name, tool.img_slug )
		this._items.set( item.uuid, {
			item,
			tool,
			is_owner: is_owner ?? item?.is_owner,
		})
		this._features.set( item.uuid, {
			type: 'Feature',
			geometry: item.geojson,
			properties: {
				icon: name,
				label: item.name || '',
				element_uuid: item.uuid,
			},
		})
		return name
	}

	commit(){
		const source = this.map?.getSource?.( this.source_id )
		if( !source ) return
		source.setData({
			type: 'FeatureCollection',
			features: [...this._features.values()],
		})
	}

	remove( uuid ){
		if( !uuid ) return false
		this._features.delete( uuid )
		this._items.delete( uuid )
		this.commit()
		return true
	}

	async upsert( item, tool, is_owner ){
		// single-item path (ex: fresh place_icon)
		const name = this._stage( item, tool, is_owner )
		if( !name ) return false
		await this._map_ready()
		this._ensure_layer()
		const ok = await this._ensure_image( name, tool.img_slug )
		if( !ok ){
			this._features.delete( item.uuid )
			this._items.delete( item.uuid )
			return false
		}
		this.commit()
		return true
	}

	async render_all( items, resolve_tool, resolve_owner ){

		if( env.LOCAL ) console.log(' RENDER-ALL; icon-layer render-all')

		// batch path (ex: layer activation) — one readiness wait,
		// deduped parallel image loads, single setData
		await this._map_ready()
		this._ensure_layer()

		if( env.LOCAL ) console.log(' RENDER-ALL; map is-ready')

		const staged = []
		for( const item of items || [] ){
			const tool = resolve_tool( item )
			if( !tool ){
				console.warn('skipping element, unknown tool', item?.uuid )
				continue
			}
			const is_owner = typeof resolve_owner === 'function'
				? resolve_owner( item )
				: ( resolve_owner ?? item?.is_owner )
			const name = this._stage( item, tool, is_owner )
			if( name ) staged.push([ item, tool, name ])
		}

		if( env.LOCAL ) console.log(' RENDER-ALL; ensuring icon images')

		// await all images loaded ( http but also loaded to map )
		const _promises = staged.map( ([ item, tool, name ]) => {
			return this._ensure_image( name, tool.img_slug ) 
		})
		await Promise.all( _promises )

		// drop features whose image failed
		for( const [ item, tool, name ] of staged ){
			if( !this.map.hasImage( name ) ){
				this._features.delete( item.uuid )
				this._items.delete( item.uuid )
			}
		}

		if( env.LOCAL ) console.log(' RENDER-ALL; should be done render all')

		this.commit()

		return true
	}

} // IconLayer


export default IconLayer
