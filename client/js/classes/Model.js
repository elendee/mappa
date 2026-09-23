import env from '../env.js?v=78'
import * as lib from '../lib.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import hal from '../hal.js?v=78'
import { xhr_piece } from '../file_handler.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'
import SVGS from '../SVGS.js?v=78'
import { Modal } from '../Modal.js?v=78'
import BROKER from '../EventBroker.js?v=78'




const MULTI_OPTIONS = new Map()
const MODEL_MAP = new Map()
const UPLOAD_MAP = new Map()
const ICON_MAP = new Map()

if( env.LOCAL ){
	setInterval(() => {
		if( MODEL_MAP.size > 10 ){
			console.log('(dev): MODEL-MAP growing large: ' +  MODEL_MAP.size )
		}
	}, 1 * 1000 )
}
console.log('(dev): MODEL-MAP keys: ' + MODEL_MAP.size )

const log_mod = ( ...args ) => {
	if( 1 ) return;
	if( env.LOCAL )	console.log( '(local) Model:',...args )
}


const req = [
	'action_route',
	'action_create',
	'action_update',
]


class Model {
	/*	
		top level methods:
		- output listing
		- output grid
		- output summary
		- build public display
		- build edit form
	*/

	constructor( init ){
		init = init || {}
		for( const key in init ){
			this[ key ] = init[ key ]
		}
		this.upload_actions = []
		this.FIELDS = GLOBAL.FIELDS.MODELS[ this.constructor.name ]
		// this.type = this.constructor.name
	}

	hydrate( data ){
		// for( const key in data ){
		// 	console.log('hydrate...', key )
		// }
		if( !this.FIELDS ) return console.error('Model must have FIELDS to hydrate', this )

		const keys = Object.keys(data)

		for( const key in this.FIELDS ){
			if( keys.includes(key) ){
				this[key] = data[key]
			}
		}

		if( data.uuid ) this.uuid = data.uuid

	}

	output_listing( args ){
		log_mod('output-listing', args )
		const {
			include_link,
			is_user,
			as_link,
			custom_link,
		} = args
		
		const is_link = as_link || custom_link
		const listing = lib.b( is_link ? 'a' : 'div', false, 'model-listing', 'model-listing-' + this.constructor.name )

		if( this._output_listing ){
			args.wrap = listing
			return this._output_listing( args )
		}

		if( as_link ) listing.href = `/${this.gen_href()}`
		if( custom_link ) listing.href = custom_link

		const name = lib.b('div', false, 'listing-name')
		name.innerText = this.title || this.name || '-'
		listing.append( name )

		if( include_link ){
			const link = lib.b('a', false, 'button')
			link.href = `/${this.route || this.constructor.name.toLowerCase()}/${this.uuid}`
			link.innerText = `go to ${this.constructor.name}`
			listing.append( link )
		}
		return listing
	}
	output_grid( args ){
		log_mod('output-grid', args )
		if( this._output_grid ) return this._output_grid( args )
		console.warn('Model missing grid', this.constructor.name )
		return lib.b('div', false, 'void-grid')
	}
	output_summary( args ){
		log_mod('output-summary', args )
		args = args || {}
		const {
			include_link, 
			as_link,
			is_user,
			corp_uuid,
		} = args

		const wrap = lib.b( as_link ? 'a' : 'div', false, 'model-summary', this.constructor.name + '-model-summary')
		if( as_link ){
			wrap.href = `/${this.route || this.constructor.name.toLowerCase()}/${this.uuid}`
		}
		if( this.uuid ) wrap.setAttribute('data-uuid', this.uuid )

		if( !this._fill_summary ){
			console.warn( this.constructor.name, ': Model needs fill-summary')
			/*
				no point to a generic / default fill-summ because it is by nature selective
			*/
		}else{
			args.wrap = wrap
			this._fill_summary( args )
		}


		if( include_link ){
			wrap.append( lib.b('br') )
			const link = lib.b('a', false, 'model-link', 'button')
			link.href = `/${ this.route || this.constructor.name.toLowerCase() || 'void'}/${ this.uuid }`
			link.innerText = `go to ${ this.constructor.name }`
			wrap.append( link )
		}

		return wrap

	}


	print_name(){
		if( this._print_name ) return this._print_name()
		return this.constructor.name
	}


	async gen_img_ele( args ){
		const {
			type,
			value,
		} = args

		const img_ele = lib.b('img', false, 'img-ele')

		switch( type ){
		case 'image':
		case 'upload':
			if( value ){

				const subdir = lib.get_subdir({ 
					slug: value,
				});

				const ele = lib.b('img', false, 'img-ele')
				ele.src = `/fs/thumbs/${subdir}/${value}`

				let c = 0
				ele.onerror = e => {
					c++
					if( c > 1 ) return;
					ele.src = lib.fail_img_src
				}

				return ele

			}else{

				img_ele.src = lib.empty_img_src

				return img_ele

			}
			break;

		case 'svg':
			const split = this.svg_slug.split('---')

			const svg = await SVGS.get_svg( ...split )

			return svg
			break;

		default:
			console.warn('unknown img ele type', args )
			img_ele.src = lib.empty_img_src
			break;
		}

		return img_ele

	} // gen img ele




	async output_full( args ){
		log_mod('build-public-full')
		const wrap = lib.b('div', false, 'model-display', 'model-display-' + this.constructor.name )
		wrap.setAttribute('data-uuid', this.uuid || '' )

		if( this._custom_pre_full ) this._custom_pre_full( wrap, args )

		const details = await this.build_public_details()
		wrap.append( details )

		if( this._custom_post_full ) this._custom_post_full( wrap, args )

		return wrap
	}
	async build_public_details(){
		log_mod('build-public-details')

		if( this._build_public_details ) return this._build_public_details() // custom / children

		const half = Math.round( Object.keys( this.FIELDS ).length / 2 )

		const wrap = lib.b('div', false, 'model-public', 'model-public-' + this.constructor.name, 'row')

		let col_size = 'column-2'

		const left = lib.b('div', false, 'column', col_size )
		const right = lib.b('div', false, 'column', col_size )
		wrap.append( left )
		wrap.append( right )

		let c = 0
		let data
		for( const key in this.FIELDS ){
			data = this.FIELDS[key]
			if( key.match(/_key$/) ){
				log_mod('skip _key', key )
				continue
			}
			if( key.match(/_suffix$/)){
				log_mod('skip _suffix', key )
				continue
			}
			if( key.match(/^is_/) ){
				log_mod('skip bool state', key )
				continue
			}
			if( data.no_edit ){
				continue
			}
			if( !Object.keys( this ).includes( key ) ){
				continue
			}
			// const use_key = data.private ? '_'+key : key
			const detail = this.build_public_detail( key )
			if( !detail ){
				console.log('skipping detail render: ' + key)
				continue
			}
			if( c >= half ){
				right.append( detail )
			}else{
				left.append( detail )
			}
			c++
		}

		return wrap

	}
	build_public_detail( key ){
		log_mod('build-public-detail')

		const data = this.FIELDS[ key ] 

		// if( data.form_view ){
		// 	if( this.current_permission ){
		// 		const allowed = GLOBAL.PERMISSIONS[ this.current_permission ]
		// 		if( !allowed?.length ){
		// 			console.error('invalid permissions config: ', this.current_permission )
		// 			// maybe block ?
		// 		}
		// 		if( !allowed.includes( data.form_view )){
		// 			return false
		// 		}
		// 	}else{
		// 		console.error(`missing current permission level for detail: ${key}`)
		// 	}
		// }

		const detail = lib.b('div', false, 'model-detail-pub', 'model-detail-pub-' + this.constructor.name )
		if( !data ){
			console.error('invalid display key: ', key )
			return detail
		}
		const value = this[key]
		
		const label = lib.b('div', false, 'public-label')
		if( !data && env.LOCAL ) debugger
		if( typeof data.label === 'string' ){
			label.innerText = data.label // allow 'empty' labels
		}else{
			label.innerText = lib.capitalize( key.replace(/_/g, ' ') )
		}
		detail.append( label )

		const val = lib.b('div', false, 'public-value')
		val.innerText = value || '-'
		detail.append( val )

		// detail.innerText = `${key}: ${value || '-'}`
		return detail
	}






	gen_href( args ){
		const {
			params,
		} = args || {}

	    let string = '';

	    if( params ){
	    	if( Object.keys( params || {} ).length ){
		        string = Object.keys( params )
		            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
		            .join('&');	    		
	        }else if( typeof params === 'string' ){
	        	string = encodeURIComponent( params )
	        }else{
	        	console.warn('invalid param to get-href', args )
	        }

	    }

	    const query_params = string ? `?${string}` : '';

	    return this.constructor.name.toLowerCase() + '/' + this.uuid + query_params;
	}




	build_edit_form( edit_args ){
		log_mod('build-edit-form')

		const {
			show_public,
			force_edit_label,
			force_type,
		} = edit_args || {}

		const form = lib.b('form', false, 'model-form', 'model-form-' + this.constructor.name )

		MODEL_MAP.set( form, {
			model: this,
		})
		
		form.edit_args = edit_args

		form.setAttribute('data-type', force_type || this.constructor.name )
		form.setAttribute('data-uuid', this.uuid || '' )

		if( this._custom_pre_form ) this._custom_pre_form({
			form,
			edit_args,
		})

		if( show_public ){
			const link_pub = lib.b('a', false, 'button')
			link_pub.href = `/${this.gen_href()}`
			link_pub.innerText = 'view public mode'
			form.append( link_pub )
		}

		const details = this.build_edit_details( edit_args )
		form.append( details )

		const save_wrap = lib.b('div', false, 'align-right', 'save-wrap')
		const submit = lib.b('input', false, 'button')
		submit.type = 'submit'
		const t = force_edit_label || this.constructor.name
		submit.value = this.uuid ? 'update ' + t : 'create ' + t
		form.addEventListener('submit', save_model )
		save_wrap.append( submit )
		form.append( save_wrap )

		if( this._custom_post_form ) this._custom_post_form({
			form,
			edit_args,
		})

		return form

	}

	
	build_edit_details( args ){
		log_mod('build-edit-details')

		const {
			split,
		} = args || {}

		const half = Math.round( Object.keys( this.FIELDS ).length / 2 )

		const wrap = lib.b('div', false, 'model-details', 'model-details-' + this.constructor.name, 'row')

		const fields = {}
		// standard
		for( const key in GLOBAL.FIELDS.STANDARD ){
			if( GLOBAL.FIELDS.STANDARD[key].no_edit ) continue
			fields[key] = GLOBAL.FIELDS.STANDARD[key]
		}
		// add custom
		for( const key in this.FIELDS ){
			if( this.FIELDS[key].no_edit || key.match(/_key$/) ) continue
			fields[key] = this.FIELDS[key]
		}

		if( split ){

			let col_size = 'column-2'

			const left = lib.b('div', false, 'column', col_size )
			const right = lib.b('div', false, 'column', col_size )
			wrap.append( left )
			wrap.append( right )

			let c = 0
			for( const key in fields ){

				const detail = this.build_edit_detail( key, fields[key] )
				if( c >= half ){
					right.append( detail )
				}else{
					left.append( detail )
				}
				c++

			}

		}else{

			const col = lib.b('div', false, 'column', 'edit-form-liner')

			for( const key in fields ){
				const detail = this.build_edit_detail( key, fields[key] )
				col.append( detail )
			}

			wrap.append( col )

		}

		return wrap

	}


	build_edit_detail( key, display_data ){
		log_mod('build-edit-detail', key )

		const class_key = key.replace(/ /g, '_')

		const wrap = lib.b('div', false, 'model-detail', 'model-detail-' + this.constructor.name, 'model-detail-' + class_key )
		if( display_data?.type ){
			wrap.classList.add( display_data.type )
		}
		const label = lib.b('label')
		label.innerHTML = display_data?.prompt || key.replace(/_/g, ' ') || '-'
		// console.log('adding...', display_data )
		wrap.append( label )

		let input, img_preview, icon_preview

		switch( display_data.type ){
		case 'string':
			input = lib.b('input', false, 'input')
			input.type = 'text'
			break;
		case 'textarea':
			input = lib.b('textarea', false, 'input')
			break;
		case 'select':
		case 'select_multi':
			input = lib.b('select', false, 'input', display_data.type )
			const blank = lib.b('option')
			blank.value = ''
			blank.innerText = 'make a selection'
			input.append( blank )
			blank.selected = true

			let OPT_SET
			if( typeof display_data.options === 'string' ){ // select's can specify a GLOBAL prop as set
				OPT_SET = GLOBAL[ display_data.options ]
			}else{ // or they can specify a set manually.  must be plain key:val json
				OPT_SET = display_data.options
			}
			MULTI_OPTIONS.set( input, OPT_SET )
			for( const opt in OPT_SET || {} ){
				const option = lib.b('option')
				option.value = opt
				option.innerText = OPT_SET[opt] 
				input.append( option )
			}

			if( display_data.type === 'select_multi'){
				input.addEventListener('change', add_multi_choice )
			}

			break;

		case 'number':
			input = lib.b('input', false, 'input')
			input.type = 'number'
			break;
		case 'price':
			const _price = lib.build_price()
			wrap.append( _price )
			input = _price.querySelector('input')
			// format value if exists:
			if( typeof this.price == 'number' ){
				setTimeout(() => {
					_price.querySelector('.price-display').innerText = lib.cents_to_currency( this.price )
				}, 200 )				
			}
			break;
		case 'date':
			input = lib.b('input', false, 'input')
			input.type = 'date'
		case 'boolean':
			input = lib.b('input', false, 'input')
			input.type = 'checkbox'
			break;
		case 'upload':
			// the pop media lib button
			const pop = lib.b('div', false, 'button', 'pop-media')
			pop.innerText = 'your images'
			pop.addEventListener('click', pop_media_for_field )
			// hidden input
			input = lib.b('input', false, 'input', 'upload')
			input.type = 'hidden'
			// preview area
			img_preview = lib.b('div', false, 'img-preview-wrap')
			wrap.append( img_preview )
			wrap.append( pop )
			UPLOAD_MAP.set( pop, {
				model: this,
				key,
				display_data,
				img_preview_wrap: img_preview,
				detail_wrap: wrap,
				hidden_input: input,
			})
			break;
		case 'icon':
			if( env.LOCAL ) console.warn('skipping icon select')
			setTimeout(() => {
				wrap.remove()
			}, 100 )
			// label.remove()
			return wrap
			// input = lib.b('div', false, 'button', 'icon-btn')
			// input.addEventListener('click', pop_icon_select )
			// input.innerText = 'select icon'
			// icon_preview = lib.b('div', false, 'icon-preview-wrap')
			// ICON_MAP.set( input, {
			// 	model: this,
			// 	icon_preview_wrap: icon_preview,
			// })
			break;
		default:
			console.error('unhandled field type: ', key, display_data )
			break;
		}

		// parse pub / private values into form:
		input.name = key
		input.setAttribute('is-field', true )

		const val = this[ key ]

		if( display_data.type === 'price' ){
			// already appended
		}else{
			wrap.append( input )
		}

		if( display_data.type === 'select_multi'){
			const existing_multi = lib.b('div', false, 'existing-multi-options')
			wrap.append( existing_multi )			

			if( typeof val === 'string' ){ // ( multi has CSV value...)
				const OPT_FIELD = GLOBAL.FIELDS.MODELS[ this.constructor.name ]?.[ key ]?.options
				const OPT_SET = GLOBAL[ OPT_FIELD ]
				if( OPT_SET ){
					lib.render_multi_options( this, OPT_SET, key, existing_multi )
				}else{
					console.error('invalid option set to hydrate key: ' + this.constructor.name, key )
				}
			}

		}else if( display_data.type === 'upload' ){

			if( val ) input.value

			this.gen_img_ele({
				type: 'image',
				value: val,
			})
			.then( ele => {
				img_preview.append( ele )
			})


		}else if( val || ( display_data?.type === 'number' && val === 0 ) ){

			if( input.type === 'checkbox' ){
				input.checked = true
			}else{
				input.value = this[ key ]
			}

		}else{
			// ..
		}

		// is required:
		if( display_data.required ){
			wrap.classList.add('required')
			const asterisk = lib.b('div', false, 'req-star')
			asterisk.innerText = '*'
			wrap.prepend( asterisk )
		}

		return wrap

	} // build edit detail


	set_custom_field( form, key, value ){
		/*
			helper function to set a custom field 
			- picked up by ingest-form will pick up and add to post body
			- sets data-custom-fields 
		*/
		try{
			const fields = form.getAttribute('data-custom-fields')
			let extant
			if( fields ){
				extant = JSON.parse( fields )
			}else{
				extant = {}
			}
			extant[key] = value
			form.setAttribute('data-custom-fields', JSON.stringify( extant ) )
		}catch(err){
			console.error( err )
		}
	}



	publish(){
		// publish only designated keys, not client obj keys
		const pub = {}
		for( const key in this.FIELDS ){
			pub[ key ] = this[ key ]
		}
		for( const key in GLOBAL.FIELDS.STANDARD ){
			pub[ key ] = this[ key ]
		}
		return pub
	}


	generate_preview( args ){
		const {
			key,
			display_data,
		} = args

		const ele = lib.b('div', false, 'preview-ele')

		let value = this[ key ]

		switch( display_data.type ){
		case 'image':
		case 'upload':
			this.gen_img_ele({
				type: 'image',
				value,
			})
			.then( _ele => {
				ele.append( _ele )
			})
			break;
		default:
			console.error('unhandled gen-preview-type', display_data )
		}

		return ele

	}



} // Model








const add_multi_choice = e => {
	// console.error('unhandled add multi choice', e.target )
	const select = e.target
	const OPT_SET = MULTI_OPTIONS.get( select )
	// console.log('yerp', OPT_SET )
	const multi = lib.build_multi( select.value, OPT_SET[ select.value ] )
	const container = select.parentElement.querySelector('.existing-multi-options')
	container.append( multi )
}

const ingest_form = form => {

	// the fields
	const model_fields = {}

	// standard fields
	for( const ele of form.querySelectorAll('input, textarea, select') ){
		const name = ele.getAttribute('name') || ele.name
		if( !name ){
			if( env.LOCAL && ele.type !== 'submit' && ele.getAttribute('is-field') === true ) console.error('no field name to ingest: ', ele )
			continue
		}
		let value
		if( ele.classList.contains('select_multi')){
			value = []
			const choices = ele.parentElement.querySelectorAll('.multi-option')
			// const OPT_SET = MULTI_OPTIONS.get( ele )
			// if( !OPT_SET ){
			// 	console.error('form / multi-select is missing option set')
			// 	continue
			// }
			for( const c of choices ){
				value.push( c.getAttribute('data-value') ) // OPT_SET[ 
			}
			value = value.join(',')
		}else if( ele.type === 'checkbox' ){
			value = ele.checked
		}else if( ele.type === 'number' ){
			value = Number( ele.value )
		}else if( ele.classList.contains('has-drop') ){
			value = ele.getAttribute('data-source')
		}else{
			value = ele.value
		}
		model_fields[ name ] = value
	}

	// custom added data- fields
	const custom_json = form.getAttribute('data-custom-fields')
	if( custom_json ){
		try{
			const json = JSON.parse( custom_json )
			for( const key in json ){
				model_fields[key] = json[key]
			}
		}catch(err){
			console.error(err )
		}
	}

	model_fields.uuid = form.getAttribute('data-uuid')

	return model_fields
}


const save_model = e => {

	e.preventDefault()

	const form = e.target

	const {
		model
	} = MODEL_MAP.get( form )
	if( !model ){
		console.error( `(model not mapped)` )
		return hal('error', 'error saving', 5000 )
	}

	const args = form.edit_args

	const model_data = ingest_form( form )
	const is_new = !model_data.uuid

	const action = is_new ? 'create_model' : 'update_model' 

	let pre_data
	if( model._pre_save_data ){
		pre_data = model._pre_save_data({
			form,
			edit_args: args,
		})
	}
	// function assigned in business logic
	// - generally because it needs access to very context-dependent vars
	if( model._pre_save_action ){
		model._pre_save_action({
			form,
			model_data,
			action
		})
	}

	const _type = form.getAttribute('data-type')

	fetch_wrap('/action_main', 'post', { // action_main, account, etc
		action,
		model: model_data,
		type: _type,
		args,
		pre_data,
	})
	.then( res => {
		if( res?.success ){
			hal('success', res?.msg || 'saved ' + _type, 5 * 1000 )

			if( res.model ){
				model.hydrate( res.model )
			}

			if( model._post_save ){
				model._post_save({
					form,
					edit_args: args,
					res,
				})
			}
			// function assigned in business logic
			// - generally because it needs access to very context-dependent vars
			if( model._post_save_action ){
				model._post_save_action({
					form,
					model_data,
					action
				})
			}
		}else{
			hal('error', res?.msg || 'error', 10 * 1000 )
		}
	})
	.catch( err => {
		hal('error', err?.msg || 'error', 10 * 1000 )
		console.error( err )
	})

}

const toggle_viz = e => {

	const viz = lib.click_parent( e.target, 'viz', false, 2 )

	const form = lib.click_parent( viz, 'model-form', false, 4 )

	const {
		model 
	} = MODEL_MAP.get( form )
	if( !model ) return console.error('model not mapped: ', model, MODEL_MAP )

	fetch_wrap('/action_main', 'post', {
		action: 'model_toggle_viz',
		uuid: form.getAttribute('data-uuid'),
		type: form.getAttribute('data-type'),
		desired_state: !viz.classList.contains('is-public'),
	})
	.then( res => {
		if( !res?.success ) return hal('error', res?.msg || 'error toggling visibility', 10 * 1000 )
		hal('success', 'saved ' + model.constructor.name + ': ' + ( res.state ? 'public' : 'private' ), 5000 )
		if( res.state ){
			viz.classList.add('is-public')
		}else{
			viz.classList.remove('is-public')
		}
		// console.log('viz res', res )
	})
}



const pop_media_for_field = e => {

	const btn = lib.click_parent( e.target, 'button', false, 4 )

	const {
		model,
		key,
		display_data,
		img_preview_wrap,
		detail_wrap,
		hidden_input,
	} = UPLOAD_MAP.get( btn )

	BROKER.publish('MEDIA_LIB', {
		model,
		key,
		display_data,
		img_preview_wrap,
		detail_wrap,
		// container: modal.liner,
		on_select: ( e, a ) => {

			const wrap = lib.click_parent( e.target, 'media-option', false, 4 )
			const slug = wrap.getAttribute('data-slug')

			const media_modal = lib.click_parent( wrap, 'modal-content', false, 4 )
			const close = media_modal.querySelector('.modal-close')
			if( close ) close.click()

			// detail_wrap.setAttribute('data-upload-slug', slug )

			hidden_input.value = slug

			model[ key ] = slug

			model.gen_img_ele({
				type: display_data.type,
				value: model[ key ],
			})
			.then( ele => {
				img_preview_wrap.innerHTML = ''
				img_preview_wrap.append( ele )
			})

			console.log('on-select', e, a )

		},
	})

}



// const handle_upload = async(e) => {

// 	// console.error('unhandled upload - revise for new Models')

// 	const input = e.target

// 	if( input.files?.length > 1 ) return hal('error', 'only one file allowed at a time', 5 * 1000)
// 	if( !input.files?.length ) return hal('error', 'no file detected', 10 * 1000 )

// 	const {
// 		model,
// 		key,
// 		display_data,
// 		on_success,
// 		img_preview_wrap,
// 		detail_wrap,
// 		hidden_input, // == input
// 	} = UPLOAD_MAP.get( input )

// 	const _file = input?.files[0]

// 	const {
// 		name,
// 		size,
// 		type,
// 	} = _file

// 	const res = await xhr_piece({
// 		file: _file, 
// 		data: {
// 			model: model.publish(),
// 			key,
// 			display_data,
// 		},
// 		hide_spinner: false,
// 	})

// 	if( res?.success ){

// 		hal('success', res.msg || 'uploaded', 5000 )

// 		const {	
// 			item,
// 		} = res || {}
// 		const {
// 			created,
// 			edited,
// 			ext,
// 			mime,
// 			slug,
// 			uuid,
// 		} = item || {}

// 		if( on_success ){
// 			on_success({
// 				res,
// 			})
// 		}else{
// 			console.warn('no on-success for', model )
// 		}

// 		if( img_preview_wrap ){

// 			const subdir = lib.get_subdir({ slug })

// 			// build
// 			const preview = lib.b('div', false, 'img-preview')
// 			preview.innerHTML = `<img src='/fs/thumbs/${subdir}/${slug}'>`
// 			// clear
// 			img_preview_wrap.innerHTML = ''
// 			// fill
// 			img_preview_wrap.append( preview )
// 		}

// 	}else{
// 		hal('error', res?.msg || 'error uploading', 10 * 1000 )
// 	}

// } // handle upload







const pop_icon_select = e => {
	const btn = lib.click_parent( e.target, 'button', false, 3 )
	const {
		model,
		icon_preview_wrap,
	} = ICON_MAP.get( btn )

	const modal = new Modal({
		type: 'icon-select',
		use_inner: true,
	})

	fetch_wrap('/action_main', 'post', {
		action: 'get_svgs',
	}, false, modal.inner_content )
	.then( res => {

		for( const key in res.svgs ){
			const data = res.svgs[key]

			let svg, ele, title

			// category
			if( typeof data === 'object' ){
				for( const slug in data ){
					svg = data[slug]
					title = slug.replace(/_/g, ' ')
					ele = build_icon({
						svg,
						category: key,
						title,
					})
					ele.addEventListener('click', select_svg )
					modal.liner.append( ele )
				}
				continue
			}

			svg = data
			title = key

			ele = build_icon({
				svg,
				title,
			})
			ele.addEventListener('click', select_svg )
			modal.liner.append( ele )

		}
	})

	document.body.append( modal.ele )

}


const build_icon = args => {
	const {
		title,
		category,
		svg,
	} = args

	const wrap = lib.b('div', false, 'icon-wrap')

	const _title = lib.b('div', false, 'icon-title')
	_title.innerText = title
	wrap.append( _title )

	if( category && env.LOCAL ){
		const _cat = lib.b('div', false, 'icon-category')
		_cat.innerText = category
		wrap.append( _cat )		
	}

	const _svg = lib.b('div', false, 'icon-svg')
	_svg.innerHTML = svg
	wrap.append( _svg )

	return wrap

}


const select_svg = e => {
	// const wrap = lib.click_parent( e.target, '')
}





export default Model