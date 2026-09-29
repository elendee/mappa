// baseLayers.js — abstracted base-layer definitions + one-time creation form.
// No localStorage here: user picks visible groups once while creating a Layer.
// Model persistence is handled elsewhere; this module is clientside form only.

import * as lib from './lib.js'

export const BASE_LAYER_GROUPS = [
	{
		id: 'roads',
		label: 'Roads',
		desc: 'Streets, highways, minor/major roads, bridges & tunnels',
		defaultVisible: true,
	},
	{
		id: 'transit',
		label: 'Transit / Rail',
		desc: 'Subway, rail & tram lines',
		defaultVisible: true,
	},
	{
		id: 'road_labels',
		label: 'Road labels',
		desc: 'Street names & highway shields',
		defaultVisible: true,
	},
	{
		id: 'landmarks',
		label: 'Landmarks / POI',
		desc: 'Shops, amenities, transit hubs & airports',
		defaultVisible: true,
	},
	{
		id: 'neighborhoods',
		label: 'Neighborhood names',
		desc: 'City, town, village & district labels',
		defaultVisible: true,
	},
	{
		id: 'buildings',
		label: 'Buildings',
		desc: 'Building footprints & 3D extrusions',
		defaultVisible: true,
	},
	{
		id: 'water',
		label: 'Water',
		desc: 'Rivers, lakes, waterways & labels',
		defaultVisible: true,
	},
	{
		id: 'land',
		label: 'Parks & landuse',
		desc: 'Parks, forests, grass, sand & landcover',
		defaultVisible: true,
	},
]

export const get_default_base_layers = () => {
	return BASE_LAYER_GROUPS.filter( g => g.defaultVisible ).map( g => g.id )
}

export function build_base_layer_form( args ){
	const {
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
	get_default_base_layers,
	build_base_layer_form,
}
