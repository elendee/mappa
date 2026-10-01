import Model from './Model.js'
import * as lib from '../lib.js'
import GLOBAL from '../GLOBAL.js'




const MAP = new Map()



class Layer extends Model {
	constructor( init ){
		super( init )
		init = init || {}

		this.name = init.name || ''

		this.style = init.style || this.style || GLOBAL.DEFAULT_STYLE

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

		this.mappa.fill_toolbox({
			layer: this,
		})

	} // post save

	_custom_post_form( args ){
		const {
			form,
			edit_args,
		} = args

		const select = form.querySelector('select[name=style]')
		select.style.display = 'none'

		const preview = lib.b('div', false, 'layer-style-preview')
		const label = lib.b('label')
		label.innerText = this.style
		preview.append( label )
		const img = lib.b('img')
		img.src = `/resource/layer_styles/${this.style}.jpg`
		preview.append( img )
		select.parentElement.insertBefore( preview, select )

		preview.addEventListener('click', choose_layer_style )

		MAP.set( preview, {
			form,
			select,
			layer: this,
			edit_args,
		})

	} // custom post form



	build_row( args ){
		const {
			mappa,
			data,
		} = args

		const wrap = lib.b('div', false, 'layer-row')
		wrap.setAttribute('data-layer-uuid', this.uuid )
		wrap.addEventListener('click', set_layer )

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

		MAP.set( wrap, {
			layer: this,
			layer_data: data,
			mappa
		})

		return wrap

	} // build row


} // Layer




const choose_layer_style = e => {

	const preview = lib.click_parent( e.target, 'layer-style-preview', false, 5 )

	const {
		form,
		select,
		layer,
		edit_args,
	} = MAP.get( preview )

	const modal = new Modal({
		type: 'style-modal',
	})

	const expl = lib.b('div', false, 'modal-expl')
	expl.innerText = `Each style comes with different icons and tools available.`
	modal.content.append( expl )

	for( const type in GLOBAL.LAYER_STYLES ){
		const data = GLOBAL.LAYER_STYLES[type]
		const selector = build_layer_selector({
			select,
			modal,
			type,
			data,
			preview,
		})
		modal.content.append( selector )
	}

	document.body.append( modal.ele )

} // choose layer style



const build_layer_selector = args => {
	const {
		select,
		modal,
		type,
		data,
		preview,
	} = args

	const wrap = lib.b('div', false, 'layer-style-selector', 'ib')
	wrap.setAttribute('data-style-type', type )
	wrap.addEventListener('click', select_layer_style )

	const label = lib.b('label')
	label.innerHTML = type
	wrap.append( label )
	wrap.append( lib.b('br') )

	const img = lib.b('img')
	img.src = `/resource/layer_styles/${type}.jpg`
	wrap.append( img )

	MAP.set( wrap, {
		preview,
		select,
		img,
		modal,
		type,
	})

	return wrap

}


const select_layer_style = e => {

	const selector = lib.click_parent( e.target, 'layer-style-selector', false, 5 )

	const {
		preview,
		select,
		img,
		modal,
		type,
	} = MAP.get( selector )

	modal.close.click()

	select.value = type

	preview.src = `/resource/layer_styles/${type}.jpg` // querySelector('img')

	selector.setAttribute('data-style-type', type )

	selector.querySelector('label').innerText = type

	hal('success', 'selected ' + type, 3000 )


}




const set_layer = e => {
	const btn = lib.click_parent( e.target, 'layer-edit', false, 4 )
	if( btn ) return;

	const wrap = lib.click_parent( e.target, 'layer-row', false, 5 )
	if( !wrap ) return;

	const nav = lib.click_parent( wrap, false, 'layer-panel', 10 )

	const container = lib.click_parent( wrap, 'nav-section', false, 4 )

	const rows = nav.querySelectorAll('.layer-row')
	for( const row of rows ){
		row.classList.remove('selected')
	}
	wrap.classList.add('selected')

	const {
		layer,
		layer_data,
		mappa,
	} = MAP.get( wrap )

	BROKER.publish('MAPPA_SET_LAYER', {
		layer,
	})

} // set layer



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

} // edit layer




export default Layer