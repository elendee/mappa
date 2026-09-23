// map.js — pseudocode (bare minimal, plan §1-3)
// initMap(allUsers) -> new maplibregl.Map({ container:'#map', style:'https://tiles.openfreemap.org/styles/positron', center:[-74.006,40.7128], zoom:10.5, maxBounds:[[-74.5,40.4],[-73.5,41.1]], renderWorldCopies:false })
// addControls: NavigationControl, GeolocateControl, ScaleControl, AttributionControl; pan/zoom via drag/scroll/pinch/keyboard; defer layer data until map.on('load')
// FUTURE: storeItem(activeLayer, undecidedType) // raster? vector? TBD

export async function initMap(){ /* pseudocode only */ }
export const NYC = { CENTER:[-74.006,40.7128], ZOOM:10.5, BOUNDS:[[-74.5,40.4],[-73.5,41.1]] }
export default { initMap, NYC }
