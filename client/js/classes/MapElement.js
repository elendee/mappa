import Model from './Model.js'
import * as lib from '../lib.js'
import GLOBAL from '../GLOBAL.js'




const MAP = new Map()



class MapElement extends Model {
	constructor( init ){
		super( init )
		init = init || {}

		this.name = init.name || ''

		this.style = init.style || this.style || GLOBAL.DEFAULT_STYLE

	}


}


export default MapElement