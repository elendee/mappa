import lib from './lib.js'
import log from './log.js'



let STORE




// --------------------
// library
// --------------------
const flush = async( data ) => {
	const {
		id,
		email,
		NOT_ID, // usually session only wants to destroy OTHER similar sessions
	} = data

	// if( id ) return log('flag', 'unhandled store flush by id')

	if( email || id  ){
		let count = 0
		const destroyed = await new Promise((resolve, reject) => {
			STORE.all(( err, sessions ) => {
				if( err ) {
					log('flag', err )
					return reject()
				}
				count = sessions.length

				let regex, destroying
				for( const key in sessions ){
					// log('flag', 'iterating: ', sessions[key].id )
					if( id ){
						if( typeof sessions[ key ].USER?.id !== 'number' ) continue
						if( sessions[key].id === NOT_ID ) continue
						if( sessions[key].USER.id === id ){
							const sid = sessions[key].id
							STORE.destroy( sid, err => {
								if( err ){
									log('flag', 'store destroy err', err )
									reject()
								}else{
									resolve(true)
								}
							})
						}

					}else{
						if( !sessions[ key ].USER?.email ) continue
						regex = new RegExp( email )
						if( sessions[key].id !== NOT_ID && sessions[ key ].USER.email.match( regex ) ){
							destroying = true // signal to wait
							// log('flag', 'attempting destroy: ', sessions[key] )
							const id = sessions[key].id
							STORE.destroy( id, err => {
								if( err ){
									log('flag', 'store destroy err', err )
									reject()
								}else{
									resolve(true)
								}
							})
						}
					}
				}
				if( !destroying ){ // should be instant return most cases
					return resolve( true ) 
				}else{ // give it time to destroy session
					setTimeout(() => {
						resolve(false) // if it hasnt returned by now, return false for 'error'
					}, 1500) // ??
				}

			})
		})
		return destroyed
	}

	log('flag', 'invalid flush given to STORE HANDLER', data )

	return false

}

const flush_all = async( avoid_request ) => {

	// const user = request?.session?.USER

	const success = await new Promise((resolve, reject) => {

		let all_good = true

		STORE.all(( err, sessions ) => {

			if( err ){
				log('flag', 'flush err', err )
				return resolve( false )
			}

			for( const key in sessions ){
				const id = sessions[key].id
				
				if( avoid_request?.session?.id === id ) continue

				STORE.destroy( id, err => {
					if( err ){
						all_good = false
						log('flag', 'err destroying session in flush all', err )
					}
				})

			}
		})

		lib.sleep( 3000 )
		.then(res => {
			resolve( all_good )
		})

	})

	return success // ( approximate ! just waits 3 seconds for no errors, does not count )

}


const get = async( id, email, slug ) => {

	let session

	if( email ){

		session = await new Promise((resolve, reject) => {
			STORE.all(( err, sessions ) => {
				if( err ) return log('flag', 'err getting session by email', err )
				// for( const key in sessions ){
				for( const session of sessions ){
					// log('flag', 'woah: ', session.USER?.email )
					if( session.USER?.email === email ){
						return resolve( session )
					}
				}
				resolve( false )
			})
		})

	}else if( id ){

		session = await new Promise((resolve, reject ) => {
			STORE.all(( err, sessions ) => {
				if( err ) return log('flag', 'err getting session user by id', err )
				for( const key in sessions ){
					if( !sessions[ key ].USER?.id ) continue
					if( sessions[ key ].USER.id === id ){
						return resolve( sessions[ key ] )
					}
				}
				resolve( false )
			})
		})

	}else if( slug ){

		session = await new Promise((resolve, reject ) => {
			STORE.all(( err, sessions ) => {
				if( err ) return log('flag', 'err getting session user by slug', err )
				for( const key in sessions ){
					if( !sessions[ key ].USER?.slug ) continue
					if( sessions[ key ].USER.slug === slug ){
						return resolve( sessions[ key ] )
					}
				}
				resolve( false )
			})
		})
	}

	return session

}



// --------------------
// init
// --------------------
const init = store => {
	STORE = store
}

// --------------------
// export
// --------------------
export default {
	flush,
	flush_all,
	get,
	init,
}