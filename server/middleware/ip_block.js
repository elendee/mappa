import log from '../log.js'
import lib from '../lib.js'


const ignores = {}


const parse = () => {
	for( const ip in ignores ){
		const date = ignores[ip]
		if( Date.now() - date > lib.times.day ){
			delete ignores[ip]
		}
	}
}
const debounced_parse = lib.make_debounce( parse, 30 * 1000, false, {})

const patterns = [
	/^\/+wp-/,
	/^\/+wordpress/,
	/^\/\.env/,
	/^\/settings/,
]

const ip_block = ( req, res, next ) => {

	const ip = ( req.headers['x-forwarded-for'] || req.connection.remoteAddress || '' ).split(',')[0].trim()

	if( ignores[ ip ] ){
		switch( req.method ){
		case 'POST':
		case 'GET':
			return res.status(403).end()
		default:
			break;
		}
	}

	for( const pattern of patterns ){
		if( req.path.match( pattern ) ){
			ignores[ ip ] = Date.now()
			log('flag', 'blocking IP: ', {
				ip,
				path: req.path,
			})
		}
	}

	debounced_parse()

	// log('flag', {
	// 	path: req.path,
	// 	type: typeof req.path
	// })

	next()


}


export default ip_block