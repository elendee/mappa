import env from './.env.js'
import DB from './db.js'
import lib from './lib.js'
import log from './log.js'
import {
	Classes,
} from './models/ModelClasses.js'
import FIELDS from './data/FIELDS.js'
import BROKER from './BROKER.js'











const UUID_KEYS = Object.keys( FIELDS.PERSISTS_UUID )










const create = async( request ) => {
	const {
		type,
		model,
		args,
		pre_data,
	} = request.body

	const user = request.session?.USER

	log('Model', 'create: ', request.body )

	try{

		/* validate */
		if( !model ) return lib.return_fail(`missing Model create data: ${type}`, `invalid model data`)

		/* get class */
		const c = Classes[ type ]
		if( !c ) return lib.return_fail(`no class for Model create: ${type}`, `unable to create`)

		/* fill uuid */
		if( UUID_KEYS.includes( type ) && !model.uuid ){
			const custom_uuid = c.custom_uuid // ( mem_uuuid etc )
			const length = FIELDS.PERSISTS_UUID[ type ]
			model.uuid = await lib.get_unique_uuid( DB, c.table, length, custom_uuid )
		}else{
			// 
		}

		/* fill ownership key(s) */
		if( c.owner_test ){
			model[ c.owner_test ] = user.id
		}

		/* make */
		const new_model = new c( model )

		if( pre_data && new_model._handle_pre_save ){
			await new_model._handle_pre_save( request, pre_data, Classes, true )
		}

		/* save */
		let res = await new_model.save()
		new_model.id = res.id
		new_model.created = res.created

		if( new_model._handle_post_save ){
			await new_model._handle_post_save( request, pre_data, Classes )
		}

		return {
			success: true,
			full_model: new_model,
			model: new_model.publish( new_model.get_request_allowed( request))
		}

	}catch( err ){
		return lib.return_fail( err, `error creating model`)
	}

} /// create









const update = async( request ) => {

	const {
		model,
		type,
		args,
		pre_data
	} = request.body

	const pool = DB.getPool()
	let sql, res, value

	try{

		log('Model', 'update: ', request.body )

		switch( type ){
		
		//

		default:

			// the class
			const MC = Classes[type]
			if( !MC ) return lib.return_fail('invalid type', 'invalid type')

			if( UUID_KEYS.includes( type )){

				if( !model.uuid ) return lib.return_fail(`model missing uuid for update: ${type}`, `invalid update`)

				// lookup
				sql = `SELECT * FROM ${MC.table} WHERE uuid=?`
				res = await pool.queryPromise( sql, model.uuid )
				if( res.error ) return lib.return_fail( res.error, `error updating model`)
				if( !res.results?.length ) return lib.return_fail('no model found to update', `no model found to update`)

				// the value
				value = new MC( res.results[0] )
				value.hydrate( model )

				// pre
				if( pre_data && value._handle_pre_save ){
					await value._handle_pre_save( request, pre_data, Classes, false )
				}

				// save
				res = await value.save()

				// post
				if( value._handle_post_save ){
					await value._handle_post_save( request, pre_data, Classes )
				}

				// pub
				const pub = value.publish( value.get_request_allowed( request ) )

				return {
					success: res?.success,
					model: pub,
					full_model: value,
				}

			}else{
				return lib.return_fail(`unhandled custom update type: ${type}`, 'unhandled custom update')
			}
			// break;
		}

		return lib.return_fail(`unhandled Model update: ${model?.type}`, `unhandled update`)

	}catch( err ){
		return lib.return_fail( err, `error updating model`)
	}

} // update












const remove = async( data ) => {

	try{

		log('Model', 'remove: ', data )

		const {
			request
		} = data
		const {
			body,
		} = request
		const {
			uuid,
			model,
		} = body

		const _model = Classes[ model ]
		if( !_model ) return lib.return_fail(`model not found`, `error removing`)

		const value = await _model.get_instance({
			column: 'uuid',
			value: uuid,
		})

		if( !value ) return lib.return_fail(`not found`, `not found`)
		await value.unset()

		// const pool = DB.getPool()
		// let sql, res
		// sql = ``

		return lib.return_fail(`unhandled Model remove: ${data?.type}`, `unhandled remove`)

	}catch( err ){
		return lib.return_fail( err, `error removing model`)
	}

} // remove















export default {
	// action,
	create,
	update,
	remove,
}