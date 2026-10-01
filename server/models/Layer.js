import Model from './Model.js'
import log from '../log.js'
import PUBLIC from '../data/PUBLIC.js'




class Layer extends Model { 
	static table='layers'; 
	static owner_test='user_key' 
	constructor(init){
		super( init )
		init = init || {}

		this.table = Layer.table

		this.style = init.style || this.style || PUBLIC.DEFAULT_STYLE

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



export default Layer