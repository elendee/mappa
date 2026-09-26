import env from './env.js'
import hal from './hal.js'
import fetch_wrap from './fetch_wrap.js'
import ui from './ui.js'
import * as lib from './lib.js'
import GLOBAL from './GLOBAL.js'
import { Modal } from './Modal.js'
import { 
	xhr_piece 
} from './file_handler.js'
import MediaItem from './classes/MediaItem.js'
import BROKER from './EventBroker.js'











const get_items = async( wrapper, show_errors ) => {

	const res = await fetch_wrap('/action_account', 'post', {
		action: 'get_media_library',
	})

	if( !res.success ){
		if( show_errors ){
			return hal('error', res?.msg || 'error fetching media library', 10 * 1000 )
		}else{
			return console.error( 'error fetching media lib', res )
		}
	}

	const items = res.results.map( item => {
		return new MediaItem( item )
	})

	return items

} // get









const fill_items = async( args ) => {
	const {
		wrapper,
		on_select,
	} = args

	wrapper.innerHTML = ''

	const items = await get_items()

	console.log('user items refresh load', items )

	for( const item of items || [] ){
		wrapper.append( item.build_item({
			// with_viz: 
			on_choose: on_select
		}) )
	}

	if( !items.length ) wrapper.innerText = 'no items'

} // fill items








const render_lib = async( event ) => {
	const {
		// container,
		on_select, // on select with scope -beneath- the media library
		model,
		key,
		display_data,
		img_preview_wrap, // the preview wrapper -beneath- the media library popup
		detail_wrap,
	} = event

	// const {
	// 	prompt,
	// 	type,
	// 	view,
	// } = display_data

	const modal = new Modal({
		type: 'media-library',
		header: 'user media'
	})

	modal.make_columns()

	// hidden upload btn
	const hidden_upload = lib.b('input')
	hidden_upload.type = 'file'
	hidden_upload.addEventListener('change', e => {

		if( hidden_upload.files?.length !== 1 ){
			return hal('error', 'must choose one item for upload', 5000 )
		}

		xhr_piece({
			file: hidden_upload.files[0], 
			data: {
				title: title.value.trim(),
			}, 
			hide_spinner: false,
		}) 
		.then( res => {

			console.log('img handle: ', res )

			if( !res.success ){
				return hal('error', res?.msg || 'error uploading', 20 * 1000 )
			}

			fill_items({
				wrapper: item_list,
				on_select,
			})

		})
		.catch( err => {
			hal('error', err?.msg || 'error uploading', 10 * 1000 )
			console.error( err )
		})

		console.log('uploading changed....', hidden_upload.file || hidden_upload.files )

	})

	// preview
	const preview = lib.b('div', false, 'preview')
	const preview_ele = model.generate_preview({
		key,
		display_data,
	})
	preview.append( preview_ele )
	modal.left_panel.append( preview )

	// upload title input
	const title = lib.b('input', false, 'input')
	title.placeholder = 'title'
	modal.left_panel.append( title )

	// upload button
	const upload = lib.b('div', false, 'button')
	upload.innerText = model?.[ key ] ? 'change' : 'upload'
	upload.addEventListener('click', () => {
		// if( !title.value ){
		// 	if( env.PRODUCTION && !confirm('proceed with no title?') ) return;
		// }
		hidden_upload.click()
	})
	modal.left_panel.append( upload )

	// lib render area
	const item_list = lib.b('div', 'item-list')
	modal.right_panel.append( item_list )

	// pop ele
	document.body.append( modal.ele )

	// get user lib
	const items = await get_items()

	// sanity check
	if( !modal.ele.parentElement ){
		return console.log('no modal', modal ) // (modal has been closed)
	}

	// render items
	for( const item of items || [] ){
		item_list.append( item.build_item({
			on_choose: on_select,
			// with_viz:
		}))
	}



} // render lib






BROKER.subscribe('MEDIA_LIB', render_lib )






export default {
	get_items,
	// pop_modal,
}