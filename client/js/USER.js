import env from './env.js?v=78'
import User from './classes/User.js?v=78'

// const user = {}
let user = new User()

try{
	const ujson = document.getElementById('user-data')?.innerHTML
	if( ujson ){
		const udata = JSON.parse( ujson )
		for( const key in udata ){
			user[key] = udata[key]
		}
		// user = new User( udata )
	}
}catch( err ){
	console.error( err )
}

if( env.EXPOSE ) window.USER = user

export default user