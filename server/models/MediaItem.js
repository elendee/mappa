/*
	MediaItem
*/
import env from '../.env.js'
import DB from '../db.js'
import lib from '../lib.js'
import log from '../log.js'
import Model from './Model.js'




class MediaItem extends Model {

	static table = 'media_library'
	static owner_test = 'user_key'

	constructor( init ){
		super( init )
		init = init || {}
		this.table = MediaItem.table
		this.owner_test = MediaItem.owner_test

		this.uuid = lib.validate_string( init.uuid, undefined )
		if( this.uuid?.length !== 16 ) log('flag', 'invalid MediaItem: no uuid given', lib.identify( this ), this.uuid )

	}

}



export default MediaItem