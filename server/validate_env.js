import env from './.env.js'
import fs from 'fs'



const required_dir = [
	'fs/tools',
	'fs/uploads',
	'fs/thumbs',
]
const required_env = [
	'APP_ROOT',
]


const validate = () => {

	// env props
	for( const req of required_env ){
		if( !env[ req ]){
			throw new Error('missing env ' + req )
		}
	}

	// directories
	for( const req of required_dir ){
		if( !fs.existsSync( env.APP_ROOT + '/' + req ) ){
			throw new Error('missing ' + req + ' folder in app-root')
		}
	}

}




export default validate 