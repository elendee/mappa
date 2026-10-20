import Model from './Model.js'
import log from '../log.js'
import PUBLIC from '../data/PUBLIC.js'




class MapView extends Model { 
	static table='mapviews'; 
	static owner_test='user_key' 
	constructor(init){
		super( init )
		init = init || {}

		this.table = MapView.table

		this.style = init.style || this.style || PUBLIC.DEFAULT_STYLE

	}

	async can_view( request ){
		const user = request.session.USER

		if( user?.id === this.user_key ) return true;
		if( !this.hidden ) return true;

		// look for any valid join
		const pool = DB.getPool()
		let sql, res 
		sql = `SELECT * FROM map_joins WHERE user_key=? AND view_key=?`
		res = await pool.queryPromise( sql, [ user.id, this.id ])
		if( res.error ) return log('flag', 'err query join', res.error )
		if( !res.results?.length ){
			return false;
		}
		const join = res.results[0]
		if( join ){ // any join can -view-.  -edit- is another method
			return true;
		}

	}

	async can_edit_map( request ){
		const user = request.session?.USER
		if( user?.id && this.user_key === user.id ) return true;
		log('flag', 'skipping role-edits ....')
		return false
	}

	async _handle_post_save( request, pre_data, Classes ){
		const {
			layers,
		} = pre_data || {}

		log('flag', 'layer post-save', {
			layers,
		})

		if( layers ){
			const {
				roads,
				transit,
				'road-labels': road_labels,
				landmarks,
				neighborhoods,
				buildings,
				water,
				land,
			} = layers

			for( const key in layers ){
				this['layer_' + key ] = layers[key]?.checked
			}

			await this.save()

		}

	}

}



export default MapView