import log from '../log.js'


const sessions = {}

const BUFFER = 5000

const set_active_stamp = ( request ) => {
	/*
		debounces self
	*/

	const user = request.session.USER
	if( !user?.id ) return;
	if( sessions[ request.session.id ] ) return;

	try{

		// buffer simply clears timeout
		sessions[ request.session.id ] = setTimeout(() => {
			if( request.session ){ // if user logs out in this buffer, kapoof
				delete sessions[ request.session.id ]
			}
		}, BUFFER )

		// (!) save immediate to make weird in-men / hydrated discrepancies unlikely (!)
		user.save()
		.then( res => {
			user.edited = res.edited
		})
		.catch( err => {
			log('flag',' err set active', err )
		})

	}catch( err ){

		log('flag', 'err set-active-stamp', {
			path: request.path,
			err,
		})

	}

}


const update_edited = ( req, res, next ) => {
	set_active_stamp( req )
	next()
}


export default update_edited