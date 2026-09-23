import env from '../.env.js'
import log from '../log.js'
import lib from '../lib.js'
import render from '../../client/map_html.js'




if( !env.PUBLIC_ROOT ) throw new Error('must provide env-public-root')



const skip = [
	/confirm_code/,
	/well-known/,
]

const reroute = ( req, res, next ) => {

	if( req.session.route_memory && req.method === 'GET' && lib.is_logged( req ) ){

		for( const reg of skip ){
			if( req.path.match( reg ) ){
				return next()
			}
		}

		// const full_url = env.PUBLIC_ROOT + req.session.route_memory
		const full_url = req.session.route_memory.replace('/', '')

		delete req.session.route_memory

		log('flag', 'DELETING / REDIRECTING ROUTE MEMORY, going to', {
			full_url,
			path: req.path,
		})

		return res.send( render('redirect', req, full_url ) )

	}

	next()

}


export default reroute