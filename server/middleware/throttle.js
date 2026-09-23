import log from '../log.js'
import lib from '../lib.js'






const HOLD_TIME = 5000
const holds = {}

const sessions = {}
const limit = {
	requests: 15, 
	frequency_allowed: 50, 
}

/*
	requests: the cache of timestamps to keep, for diffing
	- there is golden mean where:
	- - too little will be TOO responsive
	- - too many will too LITTLE responsive
	- - - ie, if it's 1000 timestamps, and one of those is 3 days long, then 999 spoofed requests could still avg out "ok" but actually wrong
	frequency:
	- just have to experiment 
*/


const allow_actions = [
	'get_svg',
]


let id
const clear_frequency = request => {

	id = request.session.id

	if( holds[id] ) return;

	if( !sessions[id]){
		sessions[id] = []
	}

	// keep array of visit timestamps
	sessions[id].push( Date.now() )

	// then get all DIFFS btw stamps
	const diffs = []
	for( let i = 0; i < sessions[id].length; i++ ){
		if( i > 0 ){
			diffs.push( Math.abs( sessions[id][i] - sessions[id][i-1] ) )
		}
	}

	const sum = diffs.reduce(( accum, a ) => accum + a, 0 )

	// get avg diff
	const avg_ms_diff = sum / diffs.length

	// log('flag', 'avg ms: ', avg_ms_diff )//, sum, diffs )

	if( isNaN( avg_ms_diff )) return true; // (only 1 entry; no diffs)

	if( diffs.length >= limit.requests && avg_ms_diff < limit.frequency_allowed ){
		// set hold to block completely for set time
		if( !holds[ id ]){
			log('flag', 'placing hold; too fast requests: ', lib.identify( request ) )
			holds[ id ] = setTimeout(()=> {
				clearTimeout( holds[id])
				delete holds[id]
			}, HOLD_TIME )
		}
		// allow reset
		delete sessions[id]
		return false
	}

	if( sessions[id].length > limit.requests ) sessions[id].shift()

	// log('flag', 'diffs len: ', sessions[id].length )

	return true

}


const throttle = ( req, res, next ) => {
	if( allow_actions.includes( req.body?.action ) ){
		next()
	}else{
		if( !clear_frequency( req ) ){
			return res.sendStatus(429)
		}
		next()
	}
}


export default throttle