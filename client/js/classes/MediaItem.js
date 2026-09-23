import env from '../env.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import hal from '../hal.js?v=78'
import ui from '../ui.js?v=78'
import * as lib from '../lib.js?v=78'
import Model from './Model.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'
import { xhr_piece } from '../file_handler.js?v=78'
import Spinner from '../Spinner.js?v=78'



const spinner = new Spinner({
	type: 'svg',
})






const MEDIA_MAP = new Map()
const UPLOAD_MAP = new Map()



if( env.LOCAL ){
	// window.MULTI_OPTIONS = MULTI_OPTIONS
	window.UPLOAD_MAP = UPLOAD_MAP
}




class MediaItem extends Model {

	static action_create = 'create_media_item'
	static action_update = 'update_media_item'
	static action_route = 'action_main'

	constructor( init ){
		super(init)
		init = init || {}

		for( const key in init ){
			this[key] = init[key]
		}

		// instantiated
		this.action_route = MediaItem.action_route
		this.action_update = MediaItem.action_update
		this.action_create = MediaItem.action_create

		// this.upload_actions = init.upload_actions
		// // [{
		// // 	upload_type: 'image',
		// // 	label: 'Upload image',
		// // 	uuid: this.uuid,
		// // }]

		this._validate_construction()

	}


	_render_uploader( args ){
		const {
			wrap,
		} = args

		const upload_col = lib.b('div', false, 'upload-actions', 'column' )// , 'column-3'

		const content = lib.b('div', false, 'content')
		upload_col.append( content )

		const file = lib.b('input')
		file.type = 'file'
		file.addEventListener('change', preview_file_upload )
		upload_col.append( file )

		UPLOAD_MAP.set( file, {
			column: upload_col,
			item: this,
		})

		upload_col.append( file )

		wrap.append( upload_col )

	}


	async _pre_save_custom( args ){
		const {
			form,
			model,
			is_new,
		} = args

		if( !is_new ){
			if( env.LOCAL ) console.log('skipping file upload; Media-Item edit')
			return;
		}

		const custom_fields = {}

		const file = form.querySelector('input[type=file]').files[0]
		if( !file ){
			hal('error', 'no file found for upload')
			return false
		}

		const res = await xhr_piece({
			upload: file,
			data: {
				title: form.querySelector('input[name=title]')?.value?.trim(),
				is_public: 1,
			},
		})

		console.log('xhr-res', res )

		if( !res?.success ) return hal('error', 'error uploading file', 8 * 1000 )

		custom_fields.item = res.item
		custom_fields.done = true

		return custom_fields

	}


	build_item( args ){

		// const {
		// 	// upload_type,
		// 	data,
		// 	// action,
		// 	// model,
		// } = args
		const {
			on_choose,
			with_viz,
		} = args || {}

		const {
			// file_action,
			ext,
			// file_type,
			filetype,
			slug,
			route,
			table, // 'media_library'
			type, // 'media_item'
		} = this

		let file_type
		for( const key in GLOBAL.FILE_TYPES ){
			const set = GLOBAL.FILE_TYPES[key]
			if( set.includes(ext) ){
				file_type = key
				break;
			}
		}
		if( !file_type ) file_type = 'unknown'

		const item = lib.b('div', false, 'media-option' )
		item.setAttribute('data-slug', slug )
		item.addEventListener('click', on_choose )

		const rm = lib.b('div', false, 'button', 'rm')
		rm.innerHTML = '&times;'
		rm.addEventListener('click', remove_item )
		item.append( rm )

		const img = lib.b('img')
		const stamp = slug?.split('_')[0]
		// console.log('WHY STAMPS..', new Date( Number( stamp ) ).toLocaleString() )
		let src
		if( !stamp ){
			console.error('missing stamp for media item slug', slug )
			src = '/resource/media/404.png'
		}else{
			if( file_type === 'image' ){
				src = GLOBAL.FS_ROOT_THUMB + '/' + lib.get_subdir( { stamp } ) + '/' + slug
			}else if( file_type === 'unknown' ){
				src = `/resource/media/document.png`
			}else{
				src = `/resource/media/document.png`
			}
		}
		img.src = src
		item.append( img )

		const title = lib.b('div', false, 'media-title', 'meta-data')
		title.title = 'file title'
		title.innerText = this.title ? lib.abbreviate( this.title, 30, 'char') : '(no title)'
		// file_slug
		item.append( title )

		const created = lib.b('div', false, 'media-created', 'meta-data')
		created.title = 'media created'
		// created.innerText = lib.auto_date( data.created )
		created.innerText = lib.auto_date( this.created )
		item.append( created )

		if( with_viz ){

			// if( !GLOBAL.HAS_VIZ[ this.constructor.name ] ) return console.warn('model has no-viz available: ', this.constructor.name )

			const viz = lib.build_viz()
			viz.classList.add('viz')
			if( this.is_public ){
				viz.classList.add('is-public')
			}else{
				//
			}
			viz.setAttribute('data-type', this.type )
			viz.setAttribute('data-uuid', this.uuid )
			viz.addEventListener('click', this.set_viz )
			item.append( viz )

		}

		MEDIA_MAP.set( item, args )

		return item


	}

} // Media-Item








const remove_item = e => {
	if( !confirm('delete media item permanently?')) return;
	const btn = lib.click_parent( e.target, 'rm', false, 5 )
	const option = lib.click_parent( e.target, 'media-option', false, 5 )
	const slug = option.getAttribute('data-slug')
	fetch_wrap('/action_main', 'post', {
		action: 'remove_media_item',
		slug,
	})
	.then( res => {
		if( !res?.success ) return hal('error', `failed to remove item`, 5000 )
		option.remove()
		hal('success', 'removed', 10000 )
	})
}


const preview_file_upload = e => {

	const input = e.target
	const upload_col = lib.click_parent( input, 'upload-actions', false, 5 )

	const data = UPLOAD_MAP.get( input )

	const file = e.target.files[0]
	if( !file.type.startsWith('image/') ){
		e.target.value = ''
		return hal('error', 'images only', 5000 )
	}

	const {
		item,
		column,
	} = data

	var reader = new FileReader();
	reader.onload = e => {

		console.warn('redo image-load for multiple layers')

		var image = new Image();
		image.src = e.target.result;
		image.onload = () => {

			spinner.hide()

			column.querySelector('.content').innerHTML = ''
			column.querySelector('.content').append( image )

			// modal.close.click()
			// var img = new fabric.Image(image);
			// img.set({
			// 	left: 100,
			// 	top: 60
			// });
			// img.scaleToWidth(200);
			// studio.get_active_layer()?.layer?.fcanvas.add(img).setActiveObject(img).requestRenderAll();

			// const { 
			// 	close 
			// } = hal('standard', 'saving image to server...')

			// BROKER.publish('SAVE_IMAGE', {
			// 	alert_close: close,
			// 	image,
			// })

		}
	}
	spinner.show()
	reader.readAsDataURL( file )

	console.log('preview-upload', column, data )

}




export default MediaItem