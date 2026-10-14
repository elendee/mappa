import fs from 'fs'
import path from 'path'
import { Jimp } from 'jimp'
import env from './.env.js'
import lib from './lib.js'
import log from './log.js'
import DB from './db.js'
import MediaItem from './models/MediaItem.js'
import FIELDS from './data/FIELDS.js'
import PUBLIC from './data/PUBLIC.js'


/*
	simple media-library upload (images only for now):
	- multer drops the file in fs/tmp, we read it with jimp and write
	  two sized versions under the same subdir (lib.get_subdir):
	  fs/uploads/<subdir>/<filename> (max 1000px either direction)
	  fs/thumbs/<subdir>/<filename>  (max 100px either direction)
	- one row in media_library ties the upload to the user
	- slug holds the bare filename (timestamp prefix); subdir is derived
	  via lib.get_subdir whenever a path is needed (no extra columns)
	- served by express static for now; permission gating happens later in node
*/


const file_handler = async( request ) => {

	if( !lib.is_logged( request ) ) return lib.return_fail('must be logged in', 'must be logged in')

	const user = request.session?.USER

	// multer .single('upload') lands on request.file; tolerate the old shape too
	const FILE = request.file || request.files?.upload
	if( !FILE ){
		return lib.return_fail('no file uploaded', 'no file uploaded')
	}

	const mime = FILE.mimetype || ''

	// images only for now
	if( !mime.startsWith('image/') ){
		try{ fs.unlinkSync( FILE.path ) }catch( err ){}
		return lib.return_fail(`non-image upload rejected: ${FILE.originalname} (${mime})`, 'only images can be uploaded for now')
	}

	let ext = path.extname( FILE.originalname || '' ).toLowerCase().replace(/^\./, '')
	if( !ext && mime ) ext = ( mime.split('/')[1] || '' ).toLowerCase()
	if( !ext ){
		return lib.return_fail(`no extension: ${FILE.originalname}`, 'could not determine file type')
	}

	if( FILE.size > 1000000 * PUBLIC.LIMITS.UPLOAD.MB ){
		return lib.return_fail('upload too large', 'maximum ' + PUBLIC.LIMITS.UPLOAD.MB + 'mb upload')
	}

	// count cap
	const pool = DB.getPool()
	let sql = `SELECT id FROM media_library WHERE user_key=?`
	let res = await pool.queryPromise( sql, [ user.id ] )
	if( res.error ) return lib.return_fail( res.error, 'error checking library' )
	if( res.results?.length >= PUBLIC.LIMITS.UPLOAD.COUNT ){
		return lib.return_fail(`maximum uploads: ${user.email}`, `maximum ${PUBLIC.LIMITS.UPLOAD.COUNT} uploads reached`)
	}

	// date bucket derived from the timestamp baked into the filename;
	// slug stores the bare filename, subdir is re-derived via lib.get_subdir
	const now = Date.now()
	const filename = `${now}_${lib.random_hex(4)}.${ext}`
	const subdir = lib.get_subdir( now )
	const dir = `${env.UPLOAD_DIR}/uploads/${subdir}`
	const thumb_dir = `${env.UPLOAD_DIR}/thumbs/${subdir}`
	fs.mkdirSync( dir, { recursive: true } )
	fs.mkdirSync( thumb_dir, { recursive: true } )
	const dest = `${dir}/${filename}`
	const thumb_dest = `${thumb_dir}/${filename}`

	// decode once; jimp failure means unsupported / corrupt image
	let image
	try{
		image = await Jimp.read( FILE.path )
	}catch( err ){
		try{ fs.unlinkSync( FILE.path ) }catch( e ){}
		return lib.return_fail(`unreadable image: ${err?.message || err}`, 'unsupported image type')
	}

	try{
		// thumb is cloned from the original so both sizes derive from source quality
		const thumb = image.clone()

		// full version: fit inside 1000px box, never upscale
		if( image.width > 1000 || image.height > 1000 ){
			image.scaleToFit({ w: 1000, h: 1000 })
		}
		await image.write( dest )

		// thumb version: fit inside 100px box, never upscale
		if( thumb.width > 100 || thumb.height > 100 ){
			thumb.scaleToFit({ w: 100, h: 100 })
		}
		await thumb.write( thumb_dest )
	}catch( err ){
		try{ fs.unlinkSync( dest ) }catch( e ){}
		try{ fs.unlinkSync( thumb_dest ) }catch( e ){}
		try{ fs.unlinkSync( FILE.path ) }catch( e ){}
		return lib.return_fail(`image resize failed: ${err?.message || err}`, 'error processing image')
	}

	try{ fs.unlinkSync( FILE.path ) }catch( err ){}

	log('file_handler', 'stored upload', { dest, thumb_dest } )

	const uuid = await lib.get_unique_uuid( DB, MediaItem.table, FIELDS.PERSISTS_UUID.MediaItem )
	if( !uuid ) return lib.return_fail(`uuid failed`, `try again`)

	const new_item = new MediaItem({
		uuid,
		user_key: user.id,
		slug: filename,
		ext,
		mime,
		title: request.body?.title,
	})

	let item_res
	try{
		item_res = await new_item.save()
	}catch( err ){
		return lib.return_fail( err, 'error saving upload' )
	}
	if( !item_res?.success ) return lib.return_fail( item_res, 'error saving upload' )

	new_item.id = item_res?.id
	new_item.created = item_res?.created
	new_item.edited = item_res?.edited

	const pub = new_item.publish( new_item.get_request_allowed( request ) )

	return {
		success: true,
		item: pub,
	}

} // file handler


export default file_handler
