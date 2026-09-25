// baseLayers.js — restores the lost "level of detail" mapping file
// Maps MapLibre style `layer.id` values to toggleable Base Layer groups.
// Designed for OpenFreeMap Liberty (openmaptiles schema) but regex-based so it
// degrades gracefully to other styles (Bright, Positron, demotiles).

export const STORAGE_PREFIX = 'mappa:base:'

export const BASE_LAYER_GROUPS = [
	{
		id: 'roads',
		label: 'Roads',
		desc: 'Streets, highways, minor/major roads, bridges & tunnels',
		// liberty ids: road_*, tunnel_*, bridge_*, road_area_pattern
		// exclude rail/transit which have their own group
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
		id: 'road-labels',
		label: 'Road labels',
		desc: 'Street names & highway shields',
		match: /^(highway-|road_shield|road_one_way)/,
		defaultVisible: true,
	},
	{
		id: 'landmarks',
		label: 'Landmarks / POI',
		desc: 'Shops, amenities, transit hubs & airports',
		match: /^(poi_|airport$|airport_)/,
		defaultVisible: true,
	},
	{
		id: 'neighborhoods',
		label: 'Neighborhood names',
		desc: 'City, town, village & district labels',
		// liberty place labels: label_city, label_town, label_village, label_state, label_country_*, label_other
		match: /^label_/,
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
		match: /^(park$|park_|landuse_|landcover_|aeroway_)/,
		defaultVisible: true,
	},
	{
		id: 'boundaries',
		label: 'Boundaries',
		desc: 'Admin & disputed boundaries',
		match: /^boundary/,
		defaultVisible: true,
	},
]

// fallback for styles that use source-layer rather than id (e.g. custom style)
// not needed for liberty but keeps mapping portable
export const SOURCE_LAYER_FALLBACK = {
	roads: ['transportation'],
	'road-labels': ['transportation_name'],
	landmarks: ['poi', 'aerodrome_label'],
	neighborhoods: ['place'],
	buildings: ['building'],
	water: ['water', 'waterway', 'water_name'],
}

export function resolveGroups(map){
	const style = map.getStyle?.()
	const layers = style?.layers || []
	const allIds = layers.map(l => l.id)

	return BASE_LAYER_GROUPS.map(g => {
		let ids = allIds.filter(id => g.match.test(id))
		if(g.exclude) ids = ids.filter(id => !g.exclude.test(id))
		// if nothing matched via id but we know source-layer for this style, try that
		if(ids.length === 0 && SOURCE_LAYER_FALLBACK[g.id]){
			const fallbackSources = SOURCE_LAYER_FALLBACK[g.id]
			ids = layers.filter(l => fallbackSources.includes(l['source-layer'])).map(l => l.id)
		}
		return { ...g, layerIds: ids }
	}).filter(g => g.layerIds.length > 0)
}

export function getStoredVisibility(groupId, fallback){
	try{
		const v = localStorage.getItem(STORAGE_PREFIX + groupId)
		if(v === 'visible') return true
		if(v === 'none') return false
	}catch(_){}
	return fallback
}

export function setStoredVisibility(groupId, visible){
	try{
		localStorage.setItem(STORAGE_PREFIX + groupId, visible ? 'visible' : 'none')
	}catch(_){}
}

export default { BASE_LAYER_GROUPS, resolveGroups, getStoredVisibility, setStoredVisibility, STORAGE_PREFIX }
