import {
	resolveGroups,
	getStoredVisibility,
	setStoredVisibility,
	getBaseLayerState,
	setBaseLayerVisible,
	applyBaseLayerState,
	hideHiddenLayers,
} from './baseLayers.js'

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

export const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
const MAPLIBRE_ESM = [
	'https://esm.sh/maplibre-gl@4.7.1?bundle',
	'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm',
]

export function resolveStyleUrl( opts = {} ){
	if( !opts.style ) return 'https://tiles.openfreemap.org/styles/liberty'
	if( /^https?:\/\//.test( opts.style ) ) return opts.style
	return 'https://tiles.openfreemap.org/styles/' + opts.style
}

// — DOM / CSS setup (formerly inline in initMap) —
export function ensureMapCss(){
	if( !document.querySelector('link[href*="maplibre-gl"]') ){
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = MAPLIBRE_CSS
		document.head.appendChild( link )
		console.warn('appending the async stylesheet')
	}
	if( !document.getElementById('map-barebones-style') ){
		const style = document.createElement('style')
		style.id = 'map-barebones-style'
		style.textContent = `
			#content{ display:flex; width:100%; height:100vh; overflow:hidden; padding:0 !important; }
			#map-wrap{ display:flex; flex:1; width:100%; height:100%; min-height:0; }
			#map{ flex:1; height:100%; width:100%; min-width:0; background:#e8e8e8; }
			#layer-panel, #sidebar{ width:300px; min-width:240px; max-width:340px; background:#fff; border-left:1px solid #ccc; overflow-y:auto; padding:12px; height:100%; box-sizing:border-box; }
			@media (max-width:800px){ #map-wrap{ flex-direction:column; } #map{ height:60vh; flex:none; } #layer-panel,#sidebar{ width:100%; max-width:none; height:40vh; border-left:none; border-top:1px solid #ccc; } }
		`
		document.head.appendChild( style )
		console.warn('appending the async barebones')
	}
}

const asEl = v => typeof v === 'string' ? document.querySelector( v ) : v

export function ensureMapDom( opts = {} ){
	const content = asEl( opts.content ) || document.getElementById('content')
	if( !content ){
		console.error('[map] #content not found')
		return {}
	}
	let mapEl = asEl( opts.mapEl ) || document.getElementById('map')
	let wrapEl = document.getElementById('map-wrap')
	let panelEl = document.getElementById('layer-panel') || document.getElementById('sidebar')

	if( !mapEl ){
		if( !wrapEl ){
			wrapEl = document.createElement('div')
			wrapEl.id = 'map-wrap'
			content.innerHTML = ''
			content.appendChild( wrapEl )
		}
		mapEl = document.createElement('div')
		mapEl.id = 'map'
		wrapEl.prepend( mapEl )

		if( !panelEl && opts.createPanel !== false ){
			panelEl = document.createElement('div')
			panelEl.id = 'layer-panel'
			panelEl.innerHTML = `
				<h4 style="margin:0 0 8px;">Layers</h4>
				<p style="font-size:.85rem;color:#666;margin:0 0 12px;">Bare-bones sidebar — layer toggles go here.</p>
				<div id="global-layer-list"></div>
				<div id="layer-list"></div>
			`
			wrapEl.appendChild( panelEl )
		}
	}
	mapEl.style.minHeight = mapEl.style.minHeight || '200px'
	return { content, mapEl, wrapEl, panelEl }
}

export async function loadMapLibre( mapEl ){
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

export function createMapInstance( maplibregl, mapEl, opts = {} ){
	return new maplibregl.Map({
		container: mapEl,
		style: resolveStyleUrl( opts ),
		center: opts.center || NYC.CENTER,
		zoom: opts.zoom ?? NYC.ZOOM,
		maxBounds: opts.bounds || NYC.BOUNDS,
		attributionControl: true,
		...opts.mapOptions,
	})
}

// — sprite-gap fallback: stable random-colored dot per missing icon —
const missingIconColors = new Map()
export function colorForIcon( id ){
	if( missingIconColors.has( id ) ) return missingIconColors.get( id )
	let h = 0
	for( let i = 0; i < id.length; i++ ) h = ( h * 31 + id.charCodeAt( i ) ) >>> 0
	const color = `hsl(${ h % 360 },70%,50%)`
	missingIconColors.set( id, color )
	return color
}

export function makeDotImage( color ){
	const size = 64
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = size
	const ctx = canvas.getContext('2d')
	ctx.clearRect( 0, 0, size, size )
	ctx.beginPath()
	ctx.arc( size / 2, size / 2, size * 0.32, 0, Math.PI * 2 )
	ctx.fillStyle = color
	ctx.fill()
	ctx.lineWidth = size * 0.08
	ctx.strokeStyle = '#fff'
	ctx.stroke()
	return ctx.getImageData( 0, 0, size, size )
}

export function attachMissingIconFallback( map ){
	const handler = e => {
		const id = e?.id
		if( !id || map.hasImage( id ) ) return
		try{ map.addImage( id, makeDotImage( colorForIcon( id ) ), { pixelRatio: 2 } ) }catch(_){}
	}
	map.on('styleimagemissing', handler)
	return () => map.off('styleimagemissing', handler)
}

export function addStandardControls( map, maplibregl ){
	map.addControl( new maplibregl.NavigationControl({
		showCompass: true,
		showZoom: true
	}), 'top-right' )
	try{
		map.addControl( new maplibregl.ScaleControl({
			maxWidth: 120,
			unit: 'imperial'
		}), 'bottom-left' )
	}catch( err ){ console.warn( err ) }
}

export function fitNYC( map, bounds = NYC.BOUNDS ){
	try{ map.fitBounds( bounds, { padding: 20, duration: 0 } ) }catch(_){}
}

export function trackResize( map, mapEl, wrapEl ){
	const ro = new ResizeObserver(() => map.resize() )
	ro.observe( mapEl )
	if( wrapEl ) ro.observe( wrapEl )
	return () => ro.disconnect()
}

// — base-layer picker: DOM-agnostic, safe to mount in sidebar OR modal —
// container: Element | selector string. Returns destroy() that unmounts rows.
// onChange({ id, visible, state }) fires after each toggle.
export function renderBaseLayerPicker( map, container, opts = {} ){
	const el = asEl( container )
	if( !el ){
		console.warn('[map] picker container not found:', container)
		return () => {}
	}
	const state = applyBaseLayerState( map )
	window._baseGroups = state
	window._allLayerIds = (map.getStyle()?.layers || []).map(l => l.id)
	opts.onGroups?.( state )

	if( !state.length ){
		el.innerHTML = opts.emptyHtml || `<div style="font-size:.85rem;color:#666;padding:6px 0;">
			No toggleable base layers found for this style.
		</div>`
		return () => { el.innerHTML = '' }
	}

	el.innerHTML = ''
	const cleanups = []
	for( const g of state ){
		const row = document.createElement('label')
		row.className = 'global-layer-row' + (g.visible ? '' : ' disabled-layer')
		row.title = `${g.layerIds.length} style layers — click to toggle`
		row.innerHTML = `
			<input type="checkbox" ${g.visible ? 'checked' : ''}>
			<div class="global-layer-text">
				<div class="global-layer-name">${g.label}</div>
				<div class="global-layer-desc">${g.desc} · ${g.layerIds.length}</div>
			</div>
		`
		const cb = row.querySelector('input')
		const apply = show => {
			setBaseLayerVisible( map, g.id, show )
			row.classList.toggle('disabled-layer', !show)
			opts.onChange?.({ id: g.id, visible: show, state: getBaseLayerState( map ) })
		}
		apply( g.visible )
		cb.checked = g.visible
		const onChange = () => apply( cb.checked )
		const onRowClick = e => {
			if( e.target === cb ) return
			cb.checked = !cb.checked
			apply( cb.checked )
		}
		cb.addEventListener('change', onChange)
		row.addEventListener('click', onRowClick)
		cleanups.push(() => {
			cb.removeEventListener('change', onChange)
			row.removeEventListener('click', onRowClick)
		})
		el.appendChild( row )
	}
	return () => {
		cleanups.forEach(fn => { try{ fn() }catch(_){} })
		el.innerHTML = ''
	}
}

// legacy wrapper: defaults to the sidebar list so old call sites keep working
export function buildBaseLayerUI( map, container ){
	return renderBaseLayerPicker( map, container || '#global-layer-list' )
}

// re-hide never-show layers + re-render every bound picker on load / style swap
export function bindBaseLayerLifecycle( map, opts = {} ){
	const containers = opts.containers || ['#global-layer-list']
	const renderAll = () => {
		hideHiddenLayers( map )
		for( const c of containers ){
			if( !asEl( c ) ) continue
			try{ renderBaseLayerPicker( map, c, opts.pickerOpts ) }catch(_){}
		}
		opts.onGroups?.( getBaseLayerState( map ) )
	}
	const onLoad = () => {
		fitNYC( map, opts.bounds )
		setTimeout(() => map.resize(), 100)
		try{ renderAll() }catch(e){ console.error('[map] base UI err', e) }
		opts.onLoad?.()
	}
	const onStyleData = () => {
		clearTimeout( map._baseRebuildT )
		map._baseRebuildT = setTimeout(() => {
			if( !map.isStyleLoaded() ) return
			try{ renderAll() }catch(_){}
		}, 300)
	}
	map.on('load', onLoad)
	map.on('styledata', onStyleData)
	return () => {
		try{ map.off('load', onLoad) }catch(_){}
		try{ map.off('styledata', onStyleData) }catch(_){}
		clearTimeout( map._baseRebuildT )
	}
}

// — composed default: same behavior as before, returns map for backward compat —
// map._mappa = { refresh, destroy, renderPicker } for custom composition.
// New opts: skipCss/skipDom/skipControls/skipFallback/skipBaseLayers,
// content/mapEl/createPanel, baseLayerContainer (or baseLayerContainers[]),
// onBaseLayers/onChange/onReady/bounds.
export async function initMap( opts = {} ){
	if( !opts.skipCss ) ensureMapCss()
	const { content, mapEl, wrapEl } = opts.skipDom
		? { content: asEl( opts.content ) || document.getElementById('content'), mapEl: asEl( opts.mapEl ) || document.getElementById('map'), wrapEl: document.getElementById('map-wrap') }
		: ensureMapDom( opts )
	if( !mapEl ){
		console.error('[map] #map not found')
		return null
	}
	const maplibregl = await loadMapLibre( mapEl )
	if( !maplibregl ) return null
	const styleUrl = resolveStyleUrl( opts )
	const map = createMapInstance( maplibregl, mapEl, { ...opts, style: styleUrl } )

	const detachFallback = opts.skipFallback ? null : attachMissingIconFallback( map )
	if( !opts.skipControls ) addStandardControls( map, maplibregl )

	const containers = opts.baseLayerContainers
		|| (opts.baseLayerContainer ? [opts.baseLayerContainer] : ['#global-layer-list'])
	const pickerOpts = { onChange: opts.onChange, onGroups: opts.onBaseLayers }
	const detachLifecycle = opts.skipBaseLayers ? null : bindBaseLayerLifecycle( map, {
		containers, pickerOpts, bounds: opts.bounds || NYC.BOUNDS,
		onGroups: opts.onBaseLayers,
	})
	const detachResize = trackResize( map, mapEl, wrapEl )

	const refresh = () => {
		hideHiddenLayers( map )
		if( opts.skipBaseLayers ) return getBaseLayerState( map )
		for( const c of containers ){
			if( !asEl( c ) ) continue
			try{ renderBaseLayerPicker( map, c, pickerOpts ) }catch(_){}
		}
		return getBaseLayerState( map )
	}
	const destroy = () => {
		try{ detachLifecycle?.() }catch(_){}
		try{ detachFallback?.() }catch(_){}
		try{ detachResize?.() }catch(_){}
		try{ map.remove() }catch(_){}
	}
	map._mappa = {
		refresh,
		destroy,
		renderPicker: (container, o) => renderBaseLayerPicker( map, container, o ),
	}
	window._map = map
	opts.onReady?.( map )
	void content
	return map
}

export default {
	initMap,
	NYC,
	// composables
	ensureMapCss,
	ensureMapDom,
	loadMapLibre,
	resolveStyleUrl,
	createMapInstance,
	attachMissingIconFallback,
	colorForIcon,
	makeDotImage,
	addStandardControls,
	fitNYC,
	trackResize,
	renderBaseLayerPicker,
	buildBaseLayerUI,
	bindBaseLayerLifecycle,
	getBaseLayerState,
	setBaseLayerVisible,
	applyBaseLayerState,
	hideHiddenLayers,
	resolveGroups,
	getStoredVisibility,
	setStoredVisibility,
}
