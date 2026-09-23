import lib from '../lib.js'
import log from '../log.js'
import DB from '../db.js'
import FIELDS from '../data/FIELDS.js'


const ensure_ids = ( req, res, next ) => {

	if( req.session?.USER ){

		// sessions
		req.session.USER.session_id = req.session.id

		// uuids
		if( !req.session.USER?.uuid ){
			lib.get_unique_uuid( DB, 'users', FIELDS.PERSISTS_UUID.User )
			.then( uuid => {
				req.session.USER.uuid = uuid
				// log('flag', 'YA GET UNIQUE')
				next()
			})
		}else{
			// log('flag', 'NO IS FINE')
			next()
		}

	}else{

		log('flag', 'missing user for request')

		next()

	}
}


export default ensure_ids