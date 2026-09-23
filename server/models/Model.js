import env from '../.env.js'
import DB from '../db.js'
import log from '../log.js'
import lib from '../lib.js'
import FIELDS from '../data/FIELDS.js'
import PUBLIC from '../data/PUBLIC.js'
// import * as openai from '../openai.js'





const UUID_PERSISTERS = Object.keys( FIELDS.PERSISTS_UUID )

const STANDARD_KEYS = Object.keys( FIELDS.STANDARD )

const STANDARD_PUB_KEYS = []
for( const key in FIELDS.STANDARD ){
	const data = FIELDS.STANDARD[key]
	if( data.view === 'all' ){
		STANDARD_PUB_KEYS.push( key )
	}
}


class Model { // extends Model

	constructor( init ){
		// super( init )
		init = init || {}
		// this.uuid = init.uuid
		// this.table = must always assign in child

		// build given fields
		this._join_field_keys()

		this._initialize( init )

	}

	static async get_instance( args ){
		const {
			column,
			value,
			limit = 1,
		} = args || {}

		const pool = DB.getPool()
		let sql, res
		sql = `SELECT * FROM ${this.table} WHERE ${column}=?`
		if( limit ) sql += ' LIMIT ' + limit
		res = await pool.queryPromise( sql, value )
		if( res.error ){
			log('flag', 'err get-instance', {
				value,
				sql,
				constructor: this.name,
				// err: res.error,
			})
			return false;
		}

		if( res.results?.length ){
			if( res.results?.length > 1 ){
				log('flag', 'returning first get-instance of many..', this.name )
			}
			return new this( res.results[0] )
		}

	}

	coerce_json( value ){
		let coerced
		if( value ){
			if( typeof value === 'string' ){
				try{
					coerced = JSON.parse( value )
				}catch( err ){
					console.error( err )
				}				
			}else if( typeof value === 'object' ){
				coerced = value // < - not that it currently returns the actual value...
			}else{
				console.error('unknown coerce-json type received', typeof value )
			}
			return coerced
		}
		return undefined
	}

	_initialize( init ){

		for( const key in this.FIELDS ){ // ( includes joined standard fields )

			let validate, config

			// exceptions to standard fields
			if( key === 'is_public' && !FIELDS.HAS_PUBLIC.includes( this.constructor.name ) ){
				// log('Model_init', 'config no_initialize: ' + this.constructor.name, key )
				continue
			}
			if( key === 'uuid' && !UUID_PERSISTERS.includes( this.constructor.name ) ){
				// log('Model_init', 'not a uuid model: ' + this.constructor.name, key )
				continue
			}

			config = this.FIELDS[key]

			switch( config.type ){
			case 'date':
			case 'number':
			case 'boolean':
			case 'price':
				validate = lib.validate_number
				break;

			case 'string':
			case 'select':
			case 'textarea':
			case 'select_multi':
			case 'upload':
			case 'icon':
				validate = lib.validate_string
				break;

			default:
				log('flag', 'unknown hydration field type', config.type, key )
				break;
			}

			if( validate ){

				if( config.is_json ){
					this._hydrate_json( init, key )
				}else{
					this[ key ] = validate( init[key], this[key], undefined )
				}

				if( config.type === 'boolean' && !this[key] ) this[key] = 0 // for mysql

				if( Object.keys( config ).includes('default') && !this[key] ) this[key] = config.default

			}

		}

	}

	_hydrate_json( init, key ){
		if( typeof init[key] === 'string' ){
			try{
				this[key] = JSON.parse( init[key] )
			}catch( err ){
				log('flag', err )
			}
		}else if( typeof init[key] === 'object' ){
			this[key] = init[key]
		}
	}


	_validate(){
		// validate(){
		if( env.SPOOF?.VALIDATE ){
			log('flag', 'spoofing Model validation')
		}

		const fields = FIELDS.MODELS[ this.constructor.name ]
		if( !fields ) return `no model configuration found`

		let data, actual_key
		for( const pub_key in fields ){
			data = fields[pub_key]
			actual_key = data.private ? '_' + pub_key : pub_key
			// log('flag', 'validating', key, data )
			if( data.required && !this[actual_key] ){
				if( env.SPOOF?.VALIDATE || this[actual_key] === '0' || this[actual_key] === 0 ) continue
				return `${ pub_key } is required`
			}
			if( data.char_limit && this[actual_key]?.length > data.char_limit ){
				return `too long (${data.char_limit} character limit): ${pub_key}`
			}
			if( data.word_limit && this[actual_key]?.split(' ')?.length > data.word_limit ){
				return `too long (${data.word_limit} word limit): ${pub_key}`
			}
		}
	}


	_join_field_keys(){
		if( !this.FIELDS ){
			this.FIELDS = JSON.parse( JSON.stringify( FIELDS.MODELS[ this.constructor.name ] || {} ) )

			// add standard fields
			const standard_fields = JSON.parse( JSON.stringify( FIELDS.STANDARD ) ) 
			for( const key in standard_fields ){
				if( this.FIELDS[key] ){
					log('flag','redundant standard / custom key: ' + this.constructor.name, key )
				}
				this.FIELDS[ key ] = standard_fields[ key ]
			}
		}
		// log('flag', 'this fields now: ' + this.constructor.name, Object.keys( this.FIELDS ) )
	}


	hydrate( data ){

		const structural = ['FIELDS', 'owner_test']

		// throw new Error('asdf')

		for( const key in data ){

			log('flag', 'hydrating: ', {
				key,
				value: data[key],
			})

			let validate, config

			// exceptions ( here and save )
			if( key === 'is_public' && !FIELDS.HAS_PUBLIC.includes( this.constructor.name ) ){
				log('Model_hydrate', 'config no_hydrate: ' + this.constructor.name, key )
				continue
			}
			if( key === 'uuid' && !UUID_PERSISTERS.includes( this.constructor.name ) ){
				log('Model_hydrate', 'not a uuid model: ' + this.constructor.name, key )
				continue
			}

			config = this.FIELDS[key]
			if( !config ){
				if( !structural.includes( key ) ){
					log('Model_hydrate', 'no config: ' + this.constructor.name, key )
				}
				continue
			}

			if( config.no_hydrate ){
				log('Model_hydrate', 'config no-hydrate: ' + this.constructor.name, key )
				continue
			}

			switch( config.type ){
			case 'date':
			case 'number':
			case 'boolean':
			case 'price':
				validate = lib.validate_number
				break;
			case 'string':
			case 'select':
			case 'textarea':
			case 'select_multi':
			case 'upload':
			case 'icon':
				validate = lib.validate_string
				break;
			default:
				log('flag', 'unknown hydration field type', config.type, key )
				break;
			}

			if( validate ){

				if( config.is_json ){
					this._hydrate_json( data, key )
				}else{
					this[ key ] = validate( data[key], undefined )
				}

				if( config.type === 'boolean' && !this[key] ) this[key] = 0 // for mysql

				if( !this[key] ){
					if( Object.keys( config ).includes('default') ){
						this[key] = config.default
					}
				}

				// if( key === 'is_public'){
				// 	log('Model_hydrate', {
				// 		key,
				// 		config, 
				// 		data_val: data[key], 
				// 		model_val: this[key] 
				// 	})
				// }

			}

		}

	}

	_add_view_permission( req_is_logged, can_edit, req_is_admin, allowed, fields ){
		/*
			mutates allowed
		*/

		let permission
		if( req_is_admin ){
			permission = 'admin'
		}else if( can_edit ){ // always return all to editors...
			permission = 'editor'
		}else if( req_is_logged ){
			permission = 'logged'
		}else{
			permission = 'default'
		}

		for( const field in fields || {} ){

			const { view } = fields[field] || {}

			if( PUBLIC.PERMISSIONS[ view ]?.includes( permission )  ){
				// log('flag', 'dafuz', field, view )
				// log('flag', 'arr', PUBLIC.PERMISSIONS[ view ] )
				allowed.push( field )
			}
		}
	}

	get_view_allowed( is_logged, can_edit, is_admin ){

		const allowed = []

		try{

			// standard fields - uuid, etc
			let fields = JSON.parse( JSON.stringify( FIELDS.STANDARD ) )
			this._add_view_permission( is_logged, can_edit, is_admin, allowed, fields )

			// model fields
			fields = FIELDS.MODELS[ this.constructor.name ]
			if( !fields ) log('flag', 'Model missing display fields: ', this.constructor.name )
			this._add_view_permission( is_logged, can_edit, is_admin, allowed, fields )

			// log('flag', ', allowed: ', allowed )

		}catch( err ){
			log('flag', 'get view err', err )
		}

		return allowed

	}

	get_request_allowed( request, ...args ){
		/*
			allowlist - default is basically nothing
		*/

		const {
			can_edit,
			is_logged,
			is_admin,
		} = this.permissions( request, ...args )

		return this.get_view_allowed( is_logged, can_edit, is_admin )

	}

	permissions( request, ...args ){
		return {
			is_logged: lib.is_logged( request ),
			is_admin: lib.is_admin( request ),
			can_edit: typeof this.can_edit === 'function' && this.can_edit( request, ...args ),
		}
	}

	can_edit( request, assoc_keys, friend_keys, owner_session_id ){
		if( lib.is_admin( request ) ) return true
		const user = request.session.USER
		const owner_test = this.owner_test || 'user_key'
		if( user?.id ){
			if( user?.id === this[ owner_test ] ) return true
			if( Array.isArray( assoc_keys ) && assoc_keys.includes( user?.id ) ) return true
			if( Array.isArray( friend_keys ) && friend_keys.includes( user?.id ) ) return true
		}
		if( owner_session_id && user.session_id === owner_session_id ) return true
		if( this.constructor.name == 'User' && this.id && this.id === user.id ) return true
		return false
	}


	publish( ...allowed ){

		if( Array.isArray( allowed?.[0] ) ){
			allowed = allowed[0]
		}else{
			allowed = allowed || []
		}

		let r = {}

		allowed = allowed.concat( STANDARD_PUB_KEYS )

		// if( this.constructor.name === 'Bot' ){
		// 	log('flag', 'wottt --->', STANDARD_PUB_KEYS )
		// }

		for( const key of allowed ){
			if( typeof this[ key ]?.publish === 'function' ){
				// only 1 recurse should be needed for infinite... 
				// maybe include a 2nd order 'allowed' somehow...
				r[ key ] = this[ key ].publish()
			}else{
				r[ key ] = this[ key ]
			}
		}

		// log('flag', 'wot...', allowed, r )

		return JSON.parse( JSON.stringify( r ) ) 

	}


	async unset( args ){
		const {
			caller,
		} = args || {}
		if( !this.table ){
			return log('flag', 'invalid table for unset', {
				constructor: this.constructor.name,
				uuid: this.uuid,
				caller,
			})			
			// throw new Error('no table for unset')
		}
		if( typeof this.id !== 'number' ){
			return log('flag', 'invalid id for unset', {
				constructor: this.constructor.name,
				uuid: this.uuid,
				caller,
			})
		 // throw new Error('invalid id for unset (' + this.id + ')')
		}
		const pool = DB.getPool()
		const sql = 'DELETE FROM ' + this.table + ' WHERE id=?'
		const res = await pool.queryPromise( sql, this.id )
		if( res.error ) return log('flag', 'error unset',res.error)
		//
	}



	mask( ...excepted ){
		/*
			publish but -default show- instead of -default hide-
		*/
		if( Array.isArray( excepted?.[0] ) ){
			excepted = excepted[0]
		}else{
			excepted = excepted || []
		}

		// log('flag', 'masking', excepted )

		const val = JSON.parse( JSON.stringify( this ) )
		for( const key of excepted ){
			delete val[ key ]
		}

		return val
	}

	async set_key( key, value ){
		const pool = DB.getPool()
		let sql, res 
		sql = `UPDATE ${this.table} SET ${key}=? WHERE id=? LIMIT 1`
		res = await pool.queryPromise( sql, [ value, this.id ] )
		if( res.error ) throw new Error( res.error  )
		if( !res.results?.affectedRows ) return log('flag', 'no rows updated' )
		return true
	}

	async save(){

		// standard fields
		const base = JSON.parse( JSON.stringify( FIELDS.STANDARD ) )

		// uuid handling
		const has_uuid = Object.keys( FIELDS.PERSISTS_UUID ).includes( this.constructor.name )
		if( !has_uuid ){
			delete base.uuid
		}

		// model fields
		const m_fields = FIELDS.MODELS[ this.constructor.name ]
		if( !m_fields ) return log('flag', 'Model is missing fields: ', this.constructor?.name, lib.identify( this ) )

		// joined fields
		for( const key in m_fields ){
			if( base[key] ){
				log('flag', '---- WARNING: ' + this.constructor.name + ' has redundant standard field: ' + key + '----')
			}else{
				base[key] = m_fields[key]
			}
		}

		const update_fields = []
		const update_vals = []

		// final iteration of all fields
		for( const key in base ){
			if( base[key].no_save ){
				continue
			}
			if( typeof base[key].type === 'boolean' ){
				base[key] = Number( !!base[key] )
			}
			if( key === 'is_public' && !FIELDS.HAS_PUBLIC.includes( this.constructor.name ) ){
				continue
			}
			if( key === 'uuid' && !UUID_PERSISTERS.includes( this.constructor.name ) ){
				continue
			}
			let value
			if( base[key].is_json ){
				value = JSON.stringify( this[key] )
			}else{
				value = this[key]
			}
			update_fields.push( key )
			update_vals.push( value )
		}

		const log_model = this.publish( this )
		delete log_model.FIELDS

		log('Model', 'save: ', {
			model: log_model,
			// m_fields,
			base,
			update_fields,
			update_vals,
		})

		const res = await DB.update( this, update_fields, update_vals )

		if( res?.success ){
			log('Model', 'saved: ', this.constructor.name )
		}else{
			log('flag', 'err saving model: ', this.constructor.name, res )
		}

		return res
		

	}

}


export default Model