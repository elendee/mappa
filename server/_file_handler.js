import fs from 'fs'
import env from './.env.js'
import path from 'path'
import detect_type from 'detect-file-type'
import { mkdirp } from 'mkdirp'
import lib from './lib.js'
import log from './log.js'
import { Jimp } from 'jimp'
import PUBLIC from './data/PUBLIC.js'
import PRIVATE from './data/PRIVATE.js'
import DB from './db.js'
import MediaItem from './models/MediaItem.js'
import alert_err from './alert_err.js'
import FIELDS from './data/FIELDS.js'





// const VALID_UPLOAD_TYPES = {
// 	image: ['jpg', 'jpeg', 'png', 'gif'],
// 	document: ['pdf', 'txt', 'docx', 'js', 'php', ],
// }

if( !env.APP_ROOT ) throw new Error('missing env.APP-ROOT')
if( !env.PUBLIC_FS_ROOT ) throw new Error('missing env.PUBLIC-FS-ROOT')
if( !env.PRIVATE_FS_ROOT ) throw new Error('missing env.PRIVATE-FS-ROOT')




// the automagical part:
// multer (under the hood in formdata), AUTO PARSES these :(
// files and objects are delegated separately


const file_handler = async( request ) => {

	if( !lib.is_logged( request ) ) return lib.return_fail('must be logged in', 'must be logged in')

	const {
		files,
		body
	} = request

	const {
		title,
		is_public,
	} = body

	log('flag', 'incoming', {
		body: request.body, 
		files: request.files 
	})

	let base_path, final_path, value, thumb_path

	const user = request.session?.USER

	// -- file exists
	const FILE = files.upload
	if( !FILE ){
		if( env.LOCAL ) debugger
		return lib.return_fail('no file uploaded', 'no file uploaded')
	}

	// -- valid / allowed types
	const detect_res = await new Promise((resolve, reject) => {
		detect_type.fromFile( FILE.path, ( err, res ) => {
			if( err ) return reject( err );
			resolve( res )
		})
	})

	if( !detect_res ) return lib.return_fail(`no file type detected:\n${FILE.path}`, `unable to detect file type`)

	const { ext, mime } = detect_res

	if( ext.match(/[A-Z]/) ){
		alert_err('some uploads are uppercase..', 'need to handle upper case uploads')
	}

	// log('file_handler', 'incoming upload:', {
	// 	ext,
	// 	mime,
	// 	size: FILE.size,
	// })


	// count
	const pool = DB.getPool()
	let sql, res
	sql = `SELECT * FROM media_library WHERE AND user_key=?`
	res = await pool.queryPromise( sql, [ user.id ] )

	// limit - but no need to check for raster layers
	const limit = PUBLIC.LIMITS.UPLOAD.COUNT
	if( res.results?.length >= limit ){
		return lib.return_fail(`maximum ${upload_type} uploaded: ${user.email}`, `maximum ${upload_type}s already uploaded: ${limit}`)
	}








	const IMAGES = PUBLIC.FILE_TYPES.image


	const temp_path = FILE.path
	// const config = PUBLIC.UPLOAD_ACTION_TYPES[ action ]
	// if( !config ) return lib.return_fail('missing config for action: ' + action, 'invalid upload configuration')
	const now = Date.now()
	const file_slug = `${now}_${lib.random_hex(4)}.${ext}`
	const subdir = lib.get_subdir( now )


	let handler

	if( IMAGES.includes( ext ) ){

		handler = handle_image_type

	}else{

		handler = handle_file_type

	}

	res = await handler({
		FILE,
		request,
		ext,
		mime,
		file_slug,
		subdir,
		temp_path,
	})
	if( !res?.success ) return lib.return_fail( res, `error uploading`)
	/*
		success
		file_ext
		file_slug
		created
		edited
	*/

	const uuid = await lib.get_unique_uuid( DB, MediaItem.table, FIELDS.PERSISTS_UUID.MediaItem )
	if( !uuid ) return lib.return_fail(`try again`, `try again`)

	const new_item = new MediaItem({
		uuid,
		user_key: user.id,
		slug: file_slug,
		ext,
		mime,
		title,
		is_public,
	})

	log('file_handler', 'saving Media-Item', new_item )

	const item_res = await new_item.save()

	new_item.id = item_res?.id
	new_item.created = item_res?.created
	new_item.edited = item_res?.edited

	log('file_handler', 'saved file: ', item_res )

	// PRIVATE.UPLOAD_NONCES[ file_slug ] = {
	// 	session_id: request.session.id,
	// 	timeout: setTimeout(() => {
	// 		// elapsed time should be one network request round-trip, so milliseconds
	// 		delete PRIVATE.UPLOAD_NONCES[ file_slug ]
	// 	}, 10 * 1000 )
	// }

	const pub = new_item.publish( new_item.get_request_allowed( request ) )

	// if( env.LOCAL ) debugger

	return {
		success: true,
		item: pub,
	}

} // file handler











const handle_file_type = async( args ) => {

	const {
		FILE,	
		request,
		file_slug,
		ext,
		mime,
		subdir,
		temp_path,
	} = args

	return {
		success: false,
		msg: 'unhandled file upload',
		file_slug: undefined,
	}

}













const handle_image_type = async( args ) => {
	const {
		FILE,
		request,
		file_slug,
		ext,
		mime,
		subdir,
		temp_path,
	} = args

	// ---- validate db model / uploader
	// if( !value ) return lib.return_fail(`invalid model for upload: ${action}`, 'invalid object for upload')

	// ----- validate size
	if( FILE.size > 1000000 * PUBLIC.LIMITS.UPLOAD.IMAGE_MB ){
		return lib.return_fail('upload too large', 'maximum ' + PUBLIC.LIMITS.UPLOAD.IMAGE_MB + 'mb upload')
	}

	// ----- build paths
	const a_path = `${PRIVATE.FS_ROOT}/${subdir}/`	
	const final_path = `${a_path}/${file_slug}` 

	// mkdirp.sync( a_path, {
	// 	mode: 0o775
	// })
	const made_path = await new Promise(( resolve_mkdirp, reject ) => {
		fs.mkdir( a_path, {
			recursive: true,
		}, ( err, made_path ) => {
			if( err ){
				log('flag', 'make-path err' )
				return reject( err )
			}
			resolve_mkdirp( made_path )
		})
	})

	if( made_path ) log('file_handler','MADE PATH', made_path )

	fs.chmodSync( a_path, 0o775 )

	log('file_handler', `attempting save to`, {
		final_path,
	})

	// ----- main
	let success = await new Promise((resolve, reject ) => {

		Jimp.read( temp_path, (err, file) => {
			if( err ) {
				log('flag', 'jimp err', err )
				return resolve( false );
			}

			file
			.scaleToFit( 
				PRIVATE.IMAGE.CONSTRAIN.LARGE, 
				PRIVATE.IMAGE.CONSTRAIN.LARGE 
			)
			.quality( 70 )
			// .greyscale()
			.write( path.resolve( final_path ))

			resolve(true)

		})

	})
	if( !success ) return lib.return_fail( 'failed main upload: ' + lib.identify( request.session?.USER ), 'failed to upload')

	// ----- thumb

	// thumb_path = `/${base_thumb_path}/${file_slug}`
	const thumb_path = `${env.APP_ROOT}${PUBLIC.FS_ROOT_THUMB}/${subdir}/${file_slug}` 

	success = await new Promise((resolve, reject ) => {

		Jimp.read( temp_path, (err, file) => {
			if( err ) {
				log('flag', 'jimp err', err )
				return resolve( false );
			}

			file
			.scaleToFit( 
				PRIVATE.IMAGE.CONSTRAIN.THUMB, 
				PRIVATE.IMAGE.CONSTRAIN.THUMB 
			)
			.quality( 50 )
			// .greyscale()
			.write( path.resolve( thumb_path ) )

			resolve(true)

		})

	})
	if( !success ) return lib.return_fail( 'failed main upload: ' + lib.identify( request.session?.USER ), 'failed to upload')

	return {
		success: true,
		file_slug,
	}

} // handle image







export default file_handler