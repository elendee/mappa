import Model from './Model.js'
import log from '../log.js'



class Layer extends Model { 
	static table='layers'; 
	static owner_test='user_key' 
	constructor(init){
		super( init )
		init = init || {}

		this.table = Layer.table

	}

	async _handle_post_save( request, pre_data, Classes ){
		// log('flag', 'handle post save', {
		// 	pre_data,
		// 	...request.body,
		// })

		const {
			layers,
		} = pre_data || {}

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