import fs from 'fs'
import lib from './lib.js'
import env from './.env.js'
import log from './log.js'
import PRIVATE from './data/PRIVATE.js'
import * as CRUD from './CRUD.js'
import BROKER from './BROKER.js'




// validate system / fs settings...
if( !env.ROOT ) throw new Error('must provide env.ROOT')




const processors = async( args ) => {

	const {
		request, 
		file_slug, 
		file_url, 
		file_type, 
		post_data
	} = args

	const {
		upload_type,
	} = request.body

	try{

		const user = request.session?.USER

		return {
			success: false,
			msg: 'deprecated upload post-processors'
		}

		// switch( upload_type ){

		// case 'text_image':
		// 	const text = await CRUD.get_text( false, post_data.text_uuid )
		// 	if( !text ) return lib.return_fail( `no text found`, `no text found`)

		// 	text.has_user_img = true
		// 	text.user_file_type = file_type

		// 	await text.save()

		// 	BROKER.publish('CACHE_TEXTS_UPDATE')

		// 	return { success: true }



		// default:
		// 	return lib.return_fail( `no post processor for upload type: ${ upload_type }`, 'invalid upload')
		// }

	}catch( err ){
		return lib.return_fail( err, 'error processing file')
	}

}


export default processors