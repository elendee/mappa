import { resolveGroups, getStoredVisibility, setStoredVisibility } from './baseLayers.js?v=78'

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

export async function initMap( opts = {} ){

	const content = document.getElementById('content')
	if( !content ) {
		console.error('[map] #content not found')
		return null
	}

	// ensure maplibre CSS is present (dashboard already injects it, but bare-bones fallback)
	if( !document.querySelector('link[href*="maplibre-gl"]') ){
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
		document.head.appendChild( link )
		console.warn('appending the async stylesheet')
	}

	// ensure bare-bones layout styles exist even without dashboard.css
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

	// reuse existing #map if rendered by server (map_html.js), otherwise create bare-bones DOM
	let mapEl = document.getElementById('map')
	let wrapEl = document.getElementById('map-wrap')
	let panelEl = document.getElementById('layer-panel') || document.getElementById('sidebar')

	if( !mapEl ){
		// clear placeholder content but keep it flex
		// if content already has children that are not map-wrap, replace
		if( !wrapEl ){
			wrapEl = document.createElement('div')
			wrapEl.id = 'map-wrap'
			content.innerHTML = ''
			content.appendChild( wrapEl )
		}
		mapEl = document.createElement('div')
		mapEl.id = 'map'
		wrapEl.prepend( mapEl )

		if( !panelEl ){
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

	// ensure map container has explicit size before MapLibre measures it
	mapEl.style.minHeight = mapEl.style.minHeight || '200px'

	// dynamic import maplibre — prefer ESM CDN, fallback to global if already loaded
	let maplibregl
	if( window.maplibregl ){
		maplibregl = window.maplibregl
	} else {
		try{
			// esm.sh provides ESM build; cdnjs +esm also works
			const mod = await import('https://esm.sh/maplibre-gl@4.7.1?bundle')
			maplibregl = mod.default || mod
		}catch( e ){
			try{
				const mod2 = await import('https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/+esm')
				maplibregl = mod2.default || mod2
			}catch( e2 ){
				console.error('[map] failed to load maplibre-gl', e, e2)
				mapEl.innerText = 'Failed to load map.'
				return null
			}
		}
		// expose for debugging / compat
		window.maplibregl = maplibregl
	}

	const styleUrl = opts.style || 'https://tiles.openfreemap.org/styles/liberty'

	const map = new maplibregl.Map({
		container: mapEl,
		style: styleUrl,
		center: opts.center || NYC.CENTER,
		zoom: opts.zoom ?? NYC.ZOOM,
		maxBounds: opts.bounds || NYC.BOUNDS,
		attributionControl: true,
		...opts.mapOptions,
	})

	// standard controls — unobtrusive, bare-bones
	map.addControl( new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right' )
	try{ map.addControl( new maplibregl.ScaleControl({ maxWidth: 120, unit: 'imperial' }), 'bottom-left' ) }catch(_){}

	// — base-layer toggles (roads, landmarks, neighborhood names, etc.)
	function buildBaseLayerUI(){
		const container = document.getElementById('global-layer-list')
		if( !container ) return
		const groups = resolveGroups(map)
		// expose for debugging / style introspection
		window._baseGroups = groups
		window._allLayerIds = (map.getStyle()?.layers || []).map(l => l.id)

		if( !groups.length ){
			container.innerHTML = `<div style="font-size:.85rem;color:#666;padding:6px 0;">
				No toggleable base layers found for this style.<br>
				<span style="font-size:.75rem;color:#999;">Style: ${ styleUrl }</span>
			</div>`
			console.warn('[map] no base-layer groups matched. Layer ids:', window._allLayerIds)
			return
		}

		container.innerHTML = ''
		for( const g of groups ){
			const visible = getStoredVisibility(g.id, g.defaultVisible ?? true)

			const row = document.createElement('label')
			row.className = 'global-layer-row' + (visible ? '' : ' disabled-layer')
			row.title = `${g.layerIds.length} style layers — click to toggle`
			row.innerHTML = `
				<input type="checkbox" ${visible ? 'checked' : ''}>
				<div class="global-layer-text">
					<div class="global-layer-name">${g.label}</div>
					<div class="global-layer-desc">${g.desc} · ${g.layerIds.length}</div>
				</div>
			`
			const cb = row.querySelector('input')

			const apply = (show) => {
				for( const lid of g.layerIds ){
					if( !map.getLayer(lid) ) continue
					try{ map.setLayoutProperty(lid, 'visibility', show ? 'visible' : 'none') }catch(_){}
				}
				row.classList.toggle('disabled-layer', !show)
				setStoredVisibility(g.id, show)
			}

			// initial state (respect localStorage)
			apply(visible)
			cb.checked = visible

			cb.addEventListener('change', () => apply(cb.checked))
			// clicking row but not checkbox also toggles (UX)
			row.addEventListener('click', e => {
				if(e.target === cb) return
				cb.checked = !cb.checked
				apply(cb.checked)
			})

			container.appendChild(row)
		}
	}

	// fit to 5 boroughs bounds on load (keeps NYC nicely framed even if center/zoom tweaked)
	map.on('load', () => {
		try{
			map.fitBounds( NYC.BOUNDS, { padding: 20, duration: 0 } )
		}catch(_){}
		// ensure canvas resizes correctly inside flex layout
		setTimeout(() => map.resize(), 100)
		try{ buildBaseLayerUI() }catch(e){ console.error('[map] base UI err', e) }
	})

	// also rebuild if style is swapped at runtime
	map.on('styledata', () => {
		// styledata fires many times; debounce
		clearTimeout(map._baseRebuildT)
		map._baseRebuildT = setTimeout(() => {
			if(map.isStyleLoaded()) try{ buildBaseLayerUI() }catch(_){}
		}, 300)
	})

	// keep map responsive to flex/sidebar toggles
	const ro = new ResizeObserver(() => map.resize() )
	ro.observe( mapEl )
	if( wrapEl ) ro.observe( wrapEl )

	// expose for console debugging
	window._map = map

	return map
}

export default { 
	initMap, 
	NYC 
}
