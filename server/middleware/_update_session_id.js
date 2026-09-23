import lib from '../lib.js'
import log from '../log.js'
import DB from '../db.js'


const ensure_ids = ( req, res, next ) => {

	if( req.session?.USER ){

		// session ids
		req.session.USER.session_id = req.session.id

		// uuids
		if( !req.session.USER?.uuid ){
			lib.get_unique_uuid( DB, 'users', 12 )
			.then( uuid => {
				req.session.USER.uuid = uuid
				next()
			})
		}else{
			next()
		}

	}else{

		log('flag', 'missing user for request')

		next()

	}
}


export default ensure_ids