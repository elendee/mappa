// init_dashboard.js — pseudocode (bare minimal, plan §5)
// initMap(allUsers); if(user.loggedIn){ layers=fetchLayers(user); showLayerPanel(layers) } else { showBaseMapOnly() }
// FUTURE: onCreateItem(activeLayer, newItem){ storeItem(activeLayer, undecidedType); renderItem(map, newItem) } // raster? vector? TBD

import Mappa from '../Mappa.js'


// https://tiles.openfreemap.org/styles/liberty
// https://tiles.openfreemap.org/styles/bright
// https://tiles.openfreemap.org/styles/positron
// https://tiles.openfreemap.org/styles/dark
// https://tiles.openfreemap.org/styles/fiord


const mappa = new Mappa()


mappa.init({
	style: 'positron',
}) // pseudocode only — real bbox/panel logic deferred
