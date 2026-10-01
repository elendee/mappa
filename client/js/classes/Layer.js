import Model from './Model.js'
import * as lib from '../lib.js'




const MAP = new Map()



class Layer extends Model {
	constructor( init ){
		super( init )
		init = init || {}

		this.name = init.name || ''

	}


	_pre_save_data( args, ...more ){
		const {
			edit_args,
			form,
		} = args || {}

		const data = {
			layers: {}
		}

		const modal = lib.click_parent( form, 'modal-content', false, 4 )
		const base_layers = modal.querySelector('.base-layer-wrap')

		const rows = base_layers.querySelectorAll('.global-layer-row')
		for( const row of rows ){
			const input = row.querySelector('input')
			const name = input.getAttribute('data-base-layer')
			data.layers[name] = {
				checked: input.checked,
			}
		}

		return data

	}


	_post_save( args ){
		const {
			form,
			edit_args,
			res,
		} = args
		const {
			// extant_row,
		} = edit_args || {}
		const {
			success,
			model,
		} = res || {}

		if( this.extant_row ){
			const layer = new Layer( model )
			layer.mappa = this.mappa
			const new_row = layer.build_row({
				data: this,
			})
			this.extant_row.parentElement.insertBefore( new_row, this.extant_row )
			this.extant_row.remove()
			const modal = lib.click_parent( form, 'modal', false, 10 )
			const close = modal ? modal.querySelector('.modal-close') : undefined
			if( close ) close.click()
		}else{
			console.warn('should have extant row for layer')
		}



		console.log('post-save', args )
	}



	build_row( args ){
		const {
			mappa,
			data,
		} = args

		const wrap = lib.b('div', false, 'layer-row')

		const name = lib.b('div', false, 'layer-name')
		name.innerText = data.name || 'unnamed'
		wrap.append( name )

		const edit = lib.b('div', false, 'layer-edit')
		edit.innerHTML = `<img src='/resource/icons/gear.png'>`
		edit.addEventListener('click', edit_layer )
		wrap.append( edit )

		MAP.set( edit, {
			row: wrap,
			layer: this,
			layer_data: data,
			mappa
		})

		return wrap

	}


}



const edit_layer = e => {
	const btn = lib.click_parent( e.target, 'layer-edit', false, 4 )
	const {
		row,
		layer_data,
		layer,
		mappa,
	} = MAP.get( btn )

	layer.mappa.pop_edit_layer({
		extant_row: row,
		extant_data: layer_data,
		is_edit: true,
		mappa,
		Layer,
	})

}




export default Layer