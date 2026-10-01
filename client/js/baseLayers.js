// baseLayers.js — base-layer group definitions (positron-locked) + creation form.
// The map style is fixed to CARTO positron (see Mappa.init), so group matchers
// target positron style layer ids directly. No multi-style fallback, no localStorage:
// the active Layer's saved layer_* prefs are the single source of truth.

import * as lib from './lib.js'

export const BASE_LAYER_GROUPS = [
	{
		id: 'roads',
		label: 'Roads',
		desc: 'Streets, highways, minor/major roads, bridges & tunnels',
		match: /^(road_|tunnel_|bridge_)/,
		exclude: /(rail|transit)/,
		defaultVisible: true,
	},
	{
		id: 'transit',
		label: 'Transit / Rail',
		desc: 'Subway, rail & tram lines',
		match: /(rail|transit)/,
		defaultVisible: true,
	},
	{
		id: 'road_labels',
		label: 'Road labels',
		desc: 'Street names & house numbers',
		match: /^(roadname_|housenumber)/,
		defaultVisible: true,
	},
	{
		id: 'landmarks',
		label: 'Landmarks / POI',
		desc: 'Shops, amenities, transit hubs & airports',
		match: /^(poi_|airport)/,
		defaultVisible: true,
	},
	{
		id: 'neighborhoods',
		label: 'Neighborhood names',
		desc: 'City, town, village & district labels',
		match: /^place_/,
		defaultVisible: true,
	},
	{
		id: 'buildings',
		label: 'Buildings',
		desc: 'Building footprints & 3D extrusions',
		match: /^building/,
		defaultVisible: true,
	},
	{
		id: 'water',
		label: 'Water',
		desc: 'Rivers, lakes, waterways & labels',
		match: /^water/,
		defaultVisible: true,
	},
	{
		id: 'land',
		label: 'Parks & landuse',
		desc: 'Parks, forests, grass, sand & landcover',
		match: /^(park$|park_|landuse_|landcover_|aeroway[-_])/,
		defaultVisible: true,
	},
]

// resolve each group to concrete style layer ids present in the loaded style
export function resolveGroups( map ){
	const layers = map.getStyle?.()?.layers || []
	const allIds = layers.map( l => l.id )

	return BASE_LAYER_GROUPS.map( g => {
		let ids = allIds.filter( id => g.match.test( id ) )
		if( g.exclude ) ids = ids.filter( id => !g.exclude.test( id ) )
		return { ...g, layerIds: ids }
	}).filter( g => g.layerIds.length > 0 )
}

// set visibility for every style layer in a group; no-op false if group unknown
export function setBaseLayerVisible( map, groupOrId, visible ){
	const id = typeof groupOrId === 'string' ? groupOrId : groupOrId?.id
	if( !id || !map?.getLayer ) return false
	const g = resolveGroups( map ).find( x => x.id === id )
	if( !g ) return false
	for( const lid of g.layerIds ){
		if( !map.getLayer( lid ) ) continue
		try{ map.setLayoutProperty( lid, 'visibility', visible ? 'visible' : 'none' ) }catch(_){}
	}
	return true
}

export const get_default_base_layers = () => {
	return BASE_LAYER_GROUPS.filter( g => g.defaultVisible ).map( g => g.id )
}

export function build_base_layer_form( args ){
	const {
		// extant_layer_data,
		selected,
		onChange,
	} = args || {}

	const initial = Array.isArray( selected ) ? selected : get_default_base_layers()

	const wrap = lib.b('div', false, 'base-layer-form')
	const header = lib.b('div', false, 'base-layer-header')
	header.innerText = 'Base layers'
	wrap.append( header )

	const list = lib.b('div', false, 'base-layer-list')
	wrap.append( list )

	const inputs = new Map()

	const read_selected = () => {
		const out = []
		for( const [ id, cb ] of inputs ){
			if( cb.checked ) out.push( id )
		}
		return out
	}

	for( const g of BASE_LAYER_GROUPS ){
		const row = lib.b('label', false, 'global-layer-row')
		row.title = g.desc

		const cb = lib.b('input')
		cb.type = 'checkbox'
		cb.checked = initial.includes( g.id )
		cb.setAttribute('data-base-layer', g.id )
		inputs.set( g.id, cb )

		const text = lib.b('div', false, 'global-layer-text')
		const name = lib.b('div', false, 'global-layer-name')
		name.innerText = g.label
		const desc = lib.b('div', false, 'global-layer-desc')
		desc.innerText = g.desc
		text.append( name )
		text.append( desc )

		row.append( cb )
		row.append( text )

		if( !cb.checked ) row.classList.add('disabled-layer')

		cb.addEventListener('change', () => {
			row.classList.toggle('disabled-layer', !cb.checked )
			if( onChange ) onChange( read_selected(), g.id, cb.checked )
			wrap.dispatchEvent( new CustomEvent('base-layers-change', {
				bubbles: true,
				detail: { selected: read_selected(), id: g.id, visible: cb.checked },
			}))
		})

		row.addEventListener('click', e => {
			if( e.target === cb ) return
			e.preventDefault()
			cb.checked = !cb.checked
			cb.dispatchEvent( new Event('change', { bubbles: true }) )
		})

		list.append( row )
	}

	wrap.get_selected = read_selected
	wrap.get_state = () => {
		return BASE_LAYER_GROUPS.map( g => ({
			...g,
			visible: !!inputs.get( g.id )?.checked,
		}))
	}
	wrap.set_selected = ids => {
		const set = new Set( Array.isArray( ids ) ? ids : [] )
		for( const [ id, cb ] of inputs ){
			cb.checked = set.has( id )
			cb.closest('.global-layer-row')?.classList.toggle('disabled-layer', !cb.checked )
		}
	}

	return wrap
}

export default {
	BASE_LAYER_GROUPS,
	resolveGroups,
	setBaseLayerVisible,
	get_default_base_layers,
	build_base_layer_form,
}
