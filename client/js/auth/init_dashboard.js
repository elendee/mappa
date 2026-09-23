// init_dashboard.js — pseudocode (bare minimal, plan §5)
// initMap(allUsers); if(user.loggedIn){ layers=fetchLayers(user); showLayerPanel(layers) } else { showBaseMapOnly() }
// FUTURE: onCreateItem(activeLayer, newItem){ storeItem(activeLayer, undecidedType); renderItem(map, newItem) } // raster? vector? TBD

import { initMap } from '../map.js?v=78'
initMap() // pseudocode only — real bbox/panel logic deferred
