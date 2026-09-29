import ui from '../ui.js'
import Mappa from '../classes/Mappa.js'
import Layer from '../classes/Layer.js'





// decl

const content = document.getElementById('content')
const map = document.getElementById('map')
const panel = document.getElementById('layer-panel')



// https://tiles.openfreemap.org/styles/liberty
// https://tiles.openfreemap.org/styles/bright
// https://tiles.openfreemap.org/styles/positron
// https://tiles.openfreemap.org/styles/dark
// https://tiles.openfreemap.org/styles/fiord


const mappa = window.mappa = new Mappa()

await mappa.init({
	container: content,
	style: 'positron',
	// center
	// zoom
	// maxBounds
	// attributionControl
})

mappa.bind_nav({
	Layer,
	nav: panel,
})

await mappa.refresh_layers({
	type: 'user',
})

await mappa.refresh_layers({
	type: 'others',
})