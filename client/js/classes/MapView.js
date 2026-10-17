import Model from './Model.js'
import * as lib from '../lib.js'
import GLOBAL from '../GLOBAL.js'
import fetch_wrap from '../fetch_wrap.js'
import BROKER from '../EventBroker.js'




const MAP = new Map()



class MapView extends Model {

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

		const rows = base_layers.querySelectorAll('.global-mappa-row')
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
			const layer = new MapView( model )
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
			mapview: this,
		})

	} // post save

	_custom_post_form( args ){
		const {
			form,
			edit_args,
		} = args

		const {
			mappa,
		} = edit_args

		const choose_icons = mappa.build_tool_picker()
		// lib.b('div', false, 'choose-icons', 'button')
		// choose_icons.innerText = 'choose icons'
		// choose_icons.addEventListener('click', choose_view_icons )
		form.append( choose_icons )

		/*

			old map style picker

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
		*/

	} // custom post form



	build_row( args ){
		const {
			mappa,
			data,
		} = args

		const wrap = lib.b('div', false, 'mappa-row')
		wrap.setAttribute('data-layer-uuid', this.uuid )
		wrap.addEventListener('click', set_map )
		MAP.set( wrap, {
			mapview: this,
			layer_data: data,
			mappa
		})

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

	} // build row


} // Map-View




const choose_view_icons = e => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )

	hal('standard', 'choose..', 3000 )

}




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
	expl.innerText = `Choose a set of icons or make your own.`
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

	fetch_wrap('/action_main', 'post', {
		action: 'get_all_toolsets',
	}, false, modal.content )
	.then( res => {
		if( !res?.success ) return hal('error', res?.msg || 'failed to get toolsets', 5000 )
		for( const r of res.results ){
			// const set = new Toolset( r )
			const picker = build_set_picker_row({
				data: r,
				load_images: true,
			})
			modal.content.append( picker )
		}
	})

} // choose layer style



const build_set_picker_row = args => {
	const {
		data,
		load_images,
	} = args

	const wrap = lib.b('div', false, 'set-picker-row')
	wrap.setAttribute('data-uuid', data.uuid)

	const name = lib.b('div', false, 'set-name')
	name.innerText = data.name
	wrap.append( name )

	const tools = lib.b('div', false, 'set-tools')
	wrap.append( tools )

	if( !load_images ){
		console.warn('skip load-images for picker')
	}else{
		fetch_wrap('/action_main', 'post', {
			action: 'get_set_tools',
		}, true )
		.then( res => {
			if( !res?.success ) return hal('error', res?.msg || 'error get tools', 5000 )
			for( const r of res.results ){
				const wrap = lib.b('div', false, 'set-tool')
				wrap.innerText = r.name
				wrap.setAttribute('data-tool-uuid', r.uuid )
				tools.append( wrap )
			}
		})
	}

	return wrap

}



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




const set_map = e => {
	const btn = lib.click_parent( e.target, 'layer-edit', false, 4 )
	if( btn ) return;

	const wrap = lib.click_parent( e.target, 'mappa-row', false, 5 )
	if( !wrap ) return;

	const nav = lib.click_parent( wrap, false, 'layer-panel', 10 )

	const container = lib.click_parent( wrap, 'nav-section', false, 4 )

	const rows = nav.querySelectorAll('.mappa-row')
	for( const row of rows ){
		row.classList.remove('selected')
	}
	wrap.classList.add('selected')

	const {
		mapview,
		layer_data,
		mappa,
	} = MAP.get( wrap )

	BROKER.publish('MAPPA_SET_MAPVIEW', {
		mapview,
		is_owner: mapview?.is_owner,
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
		MapView,
	})

} // edit layer




export default MapView