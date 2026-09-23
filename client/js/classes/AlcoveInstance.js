import env from '../env.js?v=78'
import hal from '../hal.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'
import * as lib from '../lib.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
// import popups from '../shared_popups.js?v=78'
import Model from './Model.js?v=78'
import Alcove from './Alcove.js?v=78'
import User from './User.js?v=78'
import USER from '../USER.js?v=78'
import BROKER from '../EventBroker.js?v=78'
import BINDS from '../BINDS.js?v=78'
import { Modal } from '../Modal.js?v=78'
// import { xhr_piece } from '../file_handler.js?v=78'







const MAP = new Map()



class AlcoveInstance extends Alcove {

	constructor( init, anon_svg ){

		super( init )

		init = init || {}
		// fill
		for( const key in init ){
			this[ key] = init[ key ]
		}

		this.USERS = init.USERS || {}

		this.USER_INPUT_HISTORY = []
		this.history_index = 0

		this.CHAT_MAP = new Map()

		this.ui = {

			chat: {
				wrap: lib.b('div', 'chat-wrap', 'column'),
				elements: {
					header: lib.b('div', 'cove-header'),
					log: lib.b('div', 'chat-log'),
					input_wrap: lib.b('div', 'chat-input-wrap', 'is-text'),
					input: lib.b('textarea', false, 'input'),
					input_shadow: lib.b('div', 'input-shadow'),
					input_type: lib.b('div', 'input-type'),
					submit: lib.b('div', 'chat-submit', 'button'),
					sub_nav: lib.b('div', 'chat-sub-nav'),
					new_chats: lib.b('div', 'new-chats'),
				},
			},
			room: {
				wrap: lib.b('div', 'room-wrap', 'column', 'user-listing'),
				elements: {
					users: lib.b('div', 'room-users'),
					user_list: lib.b('div', false, 'cove-userlist'),
				}
			},
			friends: {
				wrap: lib.b('div', 'friends-wrap', 'column', 'user-listing'),
				elements: {
					users: lib.b('div', 'friends-users'),
					user_list: lib.b('div', false, 'friends-userlist')
				}
			}

		}

		this.dom = this._base_build()

		this._post_build()

		this._add_input_actions()

		this._build_userlist()

		this._build_friendlist()

		this._bind()

	}

	_base_build(){

		this.dom = lib.b('div', 'cove-dom')

		for( const key in this.ui ){

			const set = this.ui[key]

			const {
				wrap,
				elements,
			} = set

			this.dom.append( wrap )

			for( const _key in elements ){
				const ele = elements[_key]
				wrap.append( ele )
			}

		}

		return this.dom

	} // base build


	_post_build(){

		this.ui.chat.elements.submit.innerText = 'send'

		this.ui.chat.elements.input_wrap.append( this.ui.chat.elements.input )
		this.ui.chat.elements.input_wrap.append( this.ui.chat.elements.submit )
		this.ui.chat.elements.input_wrap.append( this.ui.chat.elements.sub_nav )
		this.ui.chat.elements.input_wrap.append( this.ui.chat.elements.input_shadow )
		this.ui.chat.elements.input_wrap.append( this.ui.chat.elements.input_type )

		this.ui.chat.elements.input_wrap.setAttribute('data-text-type', 'text')

		this.ui.chat.elements.input_type.innerHTML = `
		<span class='is-text icon'><img src='/resource/icons/text.png'></span>
		<span class='is-code icon'><img src='/resource/icons/code.png'></span>
		<span class='is-ascii icon'><img src='/resource/icons/ascii.png'></span>
		<span class='is-poetry icon'><img src='/resource/icons/poetry.png'></span>`
		
		this.ui.chat.elements.new_chats.innerText = 'new chats'

	} // post build


	_add_input_actions(){

		const add_ascii = lib.b('div', false, 'input-action', 'button', 'action-ascii')
		add_ascii.innerText = 'img to ascii'
		add_ascii.addEventListener('click', toggle_ascii_lib )
		this.ui.chat.elements.sub_nav.append( add_ascii )
		MAP.set( add_ascii, {
			cove: this,
		})

		const add_px = lib.b('div', false, 'input-action', 'button', 'action-pixel')
		add_px.innerText = 'img to pixel'
		add_px.addEventListener('click', toggle_pixel_lib )
		this.ui.chat.elements.sub_nav.append( add_px )
		MAP.set( add_px, {
			cove: this,
		})

		const expl = lib.build_help({
			Modal,
			html:`
<h3>img to ascii</h3>
<p>
	Use this to upload images which are immediately converted to ascii.  Images are not saved.<br>
	This img-to-ascii tool uses a custom line-height, so it is best to pub
</p>`
		})
		this.ui.chat.elements.sub_nav.append( expl )

	} // add input actions



	_build_userlist(){

		const container = this.ui.room.elements.users

		const _head = lib.b('div', false, 'userlist-header')
		_head.innerText = 'current visitors'
		container.append( _head )

		const userlist = this.ui.room.elements.user_list
		container.append( userlist )

		// removed 'add' here

		fetch_wrap('/action_main', 'post', {
			action: 'get_cove_userlist',
			cove_uuid: this.uuid,
		})
		.then( res => {
			if( !res?.success ) return hal('error', res?.msg || 'err getting userlist', 4000 )
			for( const r of res.results ){
				const listing = User.build_listing({
					USER,
					cove: this,
					user_data: r,
				})
				userlist.append( listing )
			}
		})

	} // build userlist



	_build_friendlist(){

		const container = this.ui.friends.elements.users

		const _head = lib.b('div', false, 'friendlist-header')
		_head.innerText = lib.random_entry( GLOBAL.FRIENDS )
		_head.title = 'friend list'
		container.append( _head )

		const friendlist = this.ui.friends.elements.user_list
		container.append( friendlist )

		// removed 'add' here
		const add = lib.b('div', false, 'button', 'add-friend', 'add-button')
		add.innerHTML = `${lib.build_icon(GLOBAL.ICONS.user)}<span>+</span>`
		add.addEventListener('click', () => {

			const modal = new Modal({
				type: 'add-friend-pop',
			})

			modal.make_columns()

			const expl = lib.b('div', false, 'expl')
			expl.innerText = `The invite will be pending for both users until the other user accepts.`
			modal.left_panel.append( expl )
			modal.left_panel.append( lib.b('br') )

			const user_uuid = lib.b('input', false, 'input')
			user_uuid.placeholder = 'paste a user uuid (' + GLOBAL.FIELDS.PERSISTS_UUID.User + ' chars)'
			modal.left_panel.append( user_uuid )
			modal.left_panel.append( lib.b('br') )

			const _add = lib.b('div', false, 'button', 'add-user')
			_add.innerText = 'add friend'
			_add.addEventListener('click', () => {

				fetch_wrap('/action_main', 'post', {
					action: 'add_friend',
					user_uuid: user_uuid.value?.trim(),
				})
				.then( res => {
					if( !res?.success ) return hal('error', res?.msg || 'error adding', 5000 )
					hal('success', 'added', 2000 )

					const listing = User.build_listing({
						USER,
						cove: this,
						user_data: r.user,
					})

					_content.prepend( listing )

				})

			})
			modal.left_panel.append( _add )

			document.body.append( modal.ele )

		})
		container.append( add )

		fetch_wrap('/action_main', 'post', {
			action: 'get_friendlist',
		})
		.then( res => {
			if( !res?.success ) return;
			 // hal('error', res?.msg || 'err getting friendlist', 4000 )
			let notify_count = 0
			for( const r of res.results ){
				if( typeof r.notify_count === 'number'){
					notify_count += r.notify_count
				}
				const listing = User.build_listing({
					USER,
					cove: this,
					user_data: r,
				})
				friendlist.append( listing )
			}
			if( notify_count ) hal('standard', notify_count + ' new notifications', 5000 )
		})

	} // build friendslist



	_bind(){

		this.ui.chat.elements.input.addEventListener('keydown', this.input_keydown )
		this.ui.chat.elements.submit.addEventListener('click', this.send_input )
		this.ui.chat.elements.new_chats.addEventListener('click', this.scroll_to_new )
		this.ui.chat.elements.log.addEventListener('scroll', this.scroll_log )
		this.ui.chat.elements.input_type.addEventListener('click', toggle_text_type )
	}



	_add_add_user(){

		const add = lib.b('div', false, 'button', 'add-user-popup', 'add-button')
		add.innerHTML = `${lib.build_icon(GLOBAL.ICONS.user)}<span>+</span>`
		add.addEventListener('click', () => {
			const modal = new Modal({
				type: 'add-user',
			})

			modal.make_columns()

			const user_uuid = lib.b('input', false, 'input')
			user_uuid.placeholder = 'paste a user uuid (' + GLOBAL.FIELDS.PERSISTS_UUID.User + ' chars)'
			modal.left_panel.append( user_uuid )

			const _add = lib.b('div', false, 'button', 'add-user')
			_add.innerText = 'add user'
			_add.addEventListener('click', () => {

				fetch_wrap('/action_main', 'post', {
					action: 'add_user_to_cove',
					user_uuid: user_uuid.value?.trim(),
					cove_uuid: this.uuid,
				})
				.then( res => {
					if( !res?.success ) return hal('error', res?.msg || 'error adding', 5000 )
					hal('success', 'added', 2000 )

					const listing = User.build_listing({
						USER,
						cove: this,
						user_data: r.user,
					})

					_content.prepend( listing )

				})

			})
			modal.left_panel.append( _add )

			document.body.append( modal.ele )

		})
		const userlist = this.ui.room.elements.users
		userlist.append( add )

	} // add-add-user



	_on_init( args ){
		const {
			Chat,
			event,
		} = args || {}

		const {
			cove,
			chats,
			is_owner,
			is_member,
			display_name,
		} = event

		this.FIELDS = GLOBAL.FIELDS.MODELS.Alcove
		this.hydrate( cove )

		for( const chat of chats || [] ){
			const c = new Chat( chat )
			const ele = c.build({
				is_user: USER.uuid === c.sender?.uuid || USER.uuid === c.sender_uuid,
			})
			this.CHAT_MAP.set( ele, {
				chat: c,
			})
			this.ui.chat.elements.log.append( ele )
			
			c.render_sender_viz({
				ele,
			})

		}

		this.ui.chat.elements.log.scrollTo({
			top: this.ui.chat.elements.log.scrollHeight,
		})

		this.ui.chat.elements.header.innerText = display_name // cove.name

		if( is_owner ){
			const edit = this.build_edit({
				show_userlist: true,
			})
			this.ui.chat.elements.header.append( edit )

			this._add_add_user()

		}else{

			const about = lib.b('div', false, 'button', 'about-cove')
			about.innerText = 'about'
			about.addEventListener('click', () => {
				const modal = new Modal({
					type: 'about-cove',
					header: this.name,
				})

				const expl = lib.b('div')
				expl.innerText = this.description || 'no description'
				modal.content.append( expl )

				document.body.append( modal.ele )

			})
			this.ui.chat.elements.header.append( about )

			let member_btn = lib.b('div', false, 'button', 'member')

			if( this.is_private ){
				if( is_member ){
					member_btn.innerText = 'leave'
					member_btn.setAttribute('data-member-action', 'leave')
				}else{
					// require invite ?
					member_btn.innerText = 'request join'
					member_btn.setAttribute('data-member-action', 'request')
				}
			}else{
				if( is_member ){
					member_btn.innerText = 'leave'
					member_btn.setAttribute('data-member-action', 'leave')
				}else{
					member_btn.innerText = 'join'
					member_btn.setAttribute('data-member-action', 'join')
				}
			}


			if( member_btn.innerText ){
				MAP.set( member_btn, {
					cove: this,
				})
				this.ui.chat.elements.header.append( member_btn )
				member_btn.addEventListener('click', pop_join_status )
			}

			console.log('no?', {
				text: member_btn.innerText
			})

		}

	} // on init



	set_chat_size = () => {

		this.ui.chat.elements.input_shadow.innerText = this.ui.chat.elements.input.value

		const bounds = this.ui.chat.elements.input_shadow.getBoundingClientRect()
		const input_b = this.ui.chat.elements.input.getBoundingClientRect()
		if( bounds.width > input_b.width || bounds.height > 40 ){
			this.ui.chat.elements.input_wrap.classList.add('expanded')
		}else{
			this.ui.chat.elements.input_wrap.classList.remove('expanded')
		}

	}



	input_keydown = e => {

		if( !this.testing_width ){

			this.testing_width = setTimeout(() => {

				this.set_chat_size()

				delete this.testing_width

			}, 500 )

		}

		switch( e.keyCode ){

		case BINDS.enter:
			e.preventDefault()
			e.stopPropagation()

			if( e.shiftKey ){
				//
				this.ui.chat.elements.input.value += '\n'
			}else{
				this.send_input()
			}
			break;

		case BINDS.up:
			const has_selected = this.ui.chat.elements.input.selectionEnd > this.ui.chat.elements.input.selectionStart
			if( this.ui.chat.elements.input.selectionStart === 0 && !has_selected ){
				e.preventDefault()
				this.scroll_history({ dir: 'back' })
			}
			break;

		default:
			break;

		}

	} // keydown



	send_input = ( e, args ) => {
		const {
			is_pixel,
			is_ascii,
			force_value,
		} = args || {}

		const value = force_value || this.ui.chat.elements.input.value.trim()
		if( value ){
			BROKER.publish('SOCKET_SEND', {
				action: 'send_chat',
				sender_uuid: USER.uuid,
				value,
				is_code: this.ui.chat.elements.input_wrap.classList.contains('is-code'),
				is_ascii: is_ascii || this.ui.chat.elements.input_wrap.classList.contains('is-ascii'),
				is_poetry: this.ui.chat.elements.input_wrap.classList.contains('is-poetry'),
				is_pixel,
				reply_uuid: this.ui.chat.elements.input_wrap.getAttribute('data-reply-uuid')
			})

			this.USER_INPUT_HISTORY.push( value )

			if( env.LOCAL ) console.log('sent input')

		}else{
			console.warn('no chat to send')
		}

		BROKER.publish('REMOVE_CHAT_REPLY', {
			do_scroll: false,
		})

		this.history_index = this.USER_INPUT_HISTORY.length

		this.ui.chat.elements.input.value = ''

		for( const type of lib.syntax_types ){
			this.ui.chat.elements.input_wrap.classList.remove( type )
		}
		this.ui.chat.elements.input_wrap.setAttribute('data-text-type', 'text')
		this.ui.chat.elements.input_wrap.classList.add('is-text')

		// - do this on event handle instead
		// this.ui.chat.elements.log.scrollTo({
		// 	top: 999999,
		// })

		this.set_chat_size()

	} // send input



	scroll_log = e => {

		// hide 'new chats' when scrolled to bottom
		const log = this.ui.chat.elements.log
		const scrollTop    = log.scrollTop              // px scrolled from top
		const visible      = log.clientHeight           // visible height
		const scrollHeight = log.scrollHeight           // total content height
		if( scrollTop + visible > scrollHeight - 150 ){
			this.ui.chat.elements.new_chats.style.display = 'none'
		}

		if( !this.checking_translates ){
			this.checking_translates = setTimeout(() => {

				this.render_asyncs()

				delete this.checking_translates

			}, 1500 )
		}

	} // scroll log



	get_viewport_chats = () => {

		const vp_chats = []

		const log = this.ui.chat.elements.log

		const log_bound = log.getBoundingClientRect()

		const chats = log.querySelectorAll('.chat-ele')
		
		for( const ele of chats ){
			const bounds = ele.getBoundingClientRect()
			if( bounds.top < 0 ) continue
			if( bounds.bottom > window.innerHeight ) continue // not exact but fine

			vp_chats.push( ele )

		}

		return vp_chats

	} // get viewport chats



	render_asyncs = () => {
		/*
			runs entirely off data-desired-language
			to control whether / how a chat is translated, control the setting of that prop at chat.build
		*/
		
		const viewport_chats = this.get_viewport_chats()

		const log = this.ui.chat.elements.log

		for( const ele of viewport_chats ){

			const {
				chat,
			} = this.CHAT_MAP.get( ele )

			if( !chat ){
				console.warn('ele not found in chat map', ele )
				continue
			}

			if( ele.getAttribute('data-desired-language') ){
				chat.translate({
					language: ele.getAttribute('data-desired-language'),
				})
				ele.removeAttribute('data-desired-language')
			}

			const await_uuid = ele.getAttribute('data-awaiting-reply-uuid')
			if( await_uuid ){
				chat.get_reply({
					caller: 'render-asyncs'
				})
				.then( res => {
					log.scrollTo({
						top: log.scrollHeight,
						behavior: 'smooth',
					})
				})
				ele.removeAttribute('data-awaiting-reply-uuid')
			}

		}

	} // render translates




	scroll_to_new = e => {

		this.ui.chat.elements.log.scrollTo({
			top: this.ui.chat.elements.log.scrollHeight,
		})

		this.ui.chat.elements.new_chats.style.display = 'none'

	} // scroll to new



	scroll_history = args => {
		const {
			dir,
		} = args

		switch( dir ){
		case 'back':
			this.history_index--
			this.history_index = Math.max( 0, this.history_index )
			const previous = this.USER_INPUT_HISTORY[ this.history_index ]
			if( previous ){
				this.ui.chat.elements.input.value = previous
			}else{
				this.history_index++ // prevent endless decrement.. shim
			}
			break;

		default:
			console.warn('silly dir  is not handled')
			break;
		}

	} // scroll history


	remove_user = args => {
		const {
			uuid,
			caller,
		} = args

		// console.log('remove-user', {
		// 	caller,
		// })

		delete this.USERS[ uuid ]

		const selector = `.alcove-user[data-user-uuid='${uuid}']`
		const ele = this.ui.room.elements.user_list.querySelector( selector )

		if( ele ) ele.remove()

	} // remove user


	sort_user_list(){

		if( this.sorting_list ) return;

		this.sorting_list = setTimeout(() => {

			const container = this.ui.room.elements.user_list

			const array = Array.from( container.querySelectorAll('.alcove-user') )

			const buckets = {
				live: [],
				others: []
			}

			container.querySelectorAll('.alcove-user').forEach( ele => {
				if( ele.classList.contains('is-live')){
					buckets.live.push( ele )
				}else{
					buckets.others.push( ele )
				}
			})

			// -- in reverse priority order:

			// first live
			buckets.live.sort((a, b) => {
				if( a.getAttribute('data-user-handle') > b.getAttribute('data-user-handle') ){
					return 1;
				}
				return -1
			})
			for( const ele of buckets.live ){
				container.prepend( ele )
			}

			buckets.others.sort((a, b) => {
				if( a.getAttribute('data-user-handle') > b.getAttribute('data-user-handle') ){
					return 1;
				}
				return -1
			})
			for( const ele of buckets.others ){
				container.prepend( ele )
			}

			// self
			const self = container.querySelector(`.alcove-user[data-user-uuid='${USER.uuid}']`)
			if( self ){
				container.prepend( self )
			}

			// owner
			const owner = container.querySelector('.alcove-user.is-owner')
			if( owner ){
				container.prepend( owner )
			}

			this.sorting_list = false

		}, 500 )

	} // sort  user list



} // Alcove-Instance








const toggle_pixel_lib = e => {

	const btn = lib.click_parent( e.target, 'button', false, 5 )

	const modal = new Modal({
		type: 'ascii-lib', // (pixel..)
	})

	const {
		cove,
	} = MAP.get( btn )

	// upload

	// label
	const label = lib.b('label')
	label.innerText = 'choose an image to add'
	modal.content.append( label )

	modal.content.append( lib.b('br') )

	// change
	const input = lib.b('input', false, 'input')
	input.type = 'file'
	input.addEventListener('change', async( e ) => {

		if( custom.width.value > GLOBAL.PIXEL.WIDTH ){
			return hal('error', `upload is too wide (${GLOBAL.PIXEL.WIDTH})`, 3000 )
		}

		const formData = new FormData();
		formData.append('image', input.files[0] );  // for multer
		formData.append('is_mobile', !!( window.innerWidth < 800 ) )
		formData.append('custom_width', custom.width.value )
		// formData.append('custom_height', custom.height.value )

		try {

			const res = await fetch('/bitmap', {
				method: 'POST',
				body: formData,
			});

			const _res = await res.json();

			// console.log('RES !!', {
			// 	res: _res,
			// 	rgba: _res.rgba,
			// })

			pre.innerHTML = ''

			const preview = lib.b('canvas')
			pre.append( preview )

			cove.pending_pixel = _res

			if( _res.width > GLOBAL.PIXEL.WIDTH ){
				return hal('error', 'response was too large', 3000 )
			}

			render_bitmap({
				canvas: preview,
				width: _res.width,
				height: _res.height,
				rgba: _res.rgba,
			})

		}catch( err ){
			console.error('Failed:', err);
		}

	})
	modal.content.append( input )
	modal.content.append( lib.b('br') )
	modal.content.append( lib.b('br') )



	// default pixel values
	const expl_c = lib.b('div', false )
	expl_c.innerText = `Set pixel width of output - max ${GLOBAL.PIXEL.WIDTH} wide.`
	modal.content.append( expl_c )

	const custom = {
		width: lib.b('input', false, 'input', 'custom-width'),
		// height: lib.b('input', false, 'input'),
	}
	custom.width.type = 'number'
	custom.width.max = GLOBAL.PIXEL.WIDTH
	custom.width.value = Math.floor( GLOBAL.PIXEL.WIDTH / 2 )
	custom.width.classList.add('custom-number')
	modal.content.append( custom.width )


	// preview

	// const preview = lib.b('code', false, 'ascii-preview')
	const pre = lib.b('div', false, 'pixel-preview')
	// preview.append( pre )

	modal.content.append( pre )


	// auto include
	const paste = lib.b('div', false, 'button', 'paste-pixel', 'paster')
	paste.innerText = 'send to chat'
	paste.addEventListener('click', paste_pixel )
	modal.content.append( paste )
	MAP.set( paste, {
		preview_area: pre,
		cove,
		modal,
	})


	// vs. 	
	// const expl = lib.b('div')
	// expl.innerText = `Or, copy and paste into your own chat, using the 'ascii' tag for proper line height`
	// modal.content.append( expl )



	// post as ascii art

	document.body.append( modal.ele )

} // toggle pixel lib





const render_bitmap = args => {
	const {
		canvas,
		width,
		height,
		rgba,
	} = args

	canvas.width = width
	canvas.height = height

	const ctx = canvas.getContext('2d')
	const image_data = ctx.createImageData(width, height)
	const data = image_data.data

	for (let i = 0; i < rgba.length; i += 4) {
		data[i]     = rgba[i]     // r: 0-255
		data[i + 1] = rgba[i + 1] // g: 0-255
		data[i + 2] = rgba[i + 2] // b: 0-255
		data[i + 3] = rgba[i + 3] <= 1
			? Math.round(rgba[i + 3] * 255)
			: rgba[i + 3]
	}

	ctx.putImageData(image_data, 0, 0)

}





const paste_pixel = e => {
	const btn = lib.click_parent( e.target, 'button', false, 4 )

	const {
		preview_area,
		cove,
		modal,
	} = MAP.get( btn )

	const custom_width = modal.ele.querySelector('input.custom-width')

	const {
		pending_pixel,
	} = cove

	const {
		width,
		height,
		rgba,
	} = pending_pixel

	cove.send_input( null, {
		is_pixel: true,
		force_value: JSON.stringify( rgba ),
	})

	modal.close.click()

} // paste pixel





const toggle_ascii_lib = e => {

	const btn = lib.click_parent( e.target, 'button', false, 5 )

	const modal = new Modal({
		type: 'ascii-lib',
	})

	// modal.make_columns()

	const {
		cove,
	} = MAP.get( btn )

	// upload

	// label
	const label = lib.b('label')
	label.innerText = 'choose an image to add'
	modal.content.append( label )

	modal.content.append( lib.b('br') )

	// change
	const input = lib.b('input', false, 'input')
	input.type = 'file'
	input.addEventListener('change', async( e ) => {

		const formData = new FormData();
		formData.append('image', input.files[0] );  // for multer
		formData.append('is_mobile', !!( window.innerWidth < 800 ) )
		formData.append('custom_width', custom.width.value )
		formData.append('custom_height', custom.height.value )

		try {

			const res = await fetch('/ascii', {
				method: 'POST',
				body: formData,
			});

			const _res = await res.json();

			if( !_res?.success ) return hal('error', res?.msg || 'error converting', 5000 )

			pre.innerHTML = _res.ascii

		}catch( err ){
			console.error('Failed:', err);
		}

	})
	modal.content.append( input )
	modal.content.append( lib.b('br') )
	modal.content.append( lib.b('br') )



	// default pixel values
	const expl_c = lib.b('div', false )
	expl_c.innerText = `Adjust # of chars to skew the width / height if you wish.
${GLOBAL.ASCII.WIDTH} / ${GLOBAL.ASCII.HEIGHT} renders approx 1:1 due to characters being taller than they are wide.`
	modal.content.append( expl_c )

	const custom = {
		width: lib.b('input', false, 'input'),
		height: lib.b('input', false, 'input'),
	}
	custom.width.type = 'number'
	custom.height.type = 'number'
	custom.width.value = GLOBAL.ASCII.WIDTH
	custom.height.value = GLOBAL.ASCII.HEIGHT
	custom.width.classList.add('custom-number')
	custom.height.classList.add('custom-number')
	modal.content.append( custom.width )
	modal.content.append( custom.height )


	// preview

	const preview = lib.b('code', false, 'ascii-preview')
	const pre = lib.b('textarea')
	preview.append( pre )
	modal.content.append( preview )


	// auto include
	const paste = lib.b('div', false, 'button', 'paste-ascii', 'paster')
	paste.innerText = 'send to chat'
	paste.addEventListener('click', paste_ascii )
	modal.content.append( paste )
	MAP.set( paste, {
		textarea: pre,
		cove,
	})


	// vs. 	
	const expl = lib.b('div')
	expl.innerText = `Or, copy and paste into your own chat, using the 'ascii' tag for proper line height`
	modal.content.append( expl )



	// post as ascii art

	document.body.append( modal.ele )


} // toggle ascii lib





const paste_ascii = e => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )

	const modal = lib.click_parent( btn, 'modal', false, 5 )
	const close = modal.querySelector('.modal-close')
	if( close ) close.click()

	const {
		textarea,
		cove,
	} = MAP.get( btn )

	cove.ui.chat.elements.input.value = textarea.value

	cove.send_input( null, {
		is_ascii: true,
	})

} // paste ascii





const toggle_text_type = e => {

	const input_type = lib.click_parent( e.target, false, 'input-type', 5 )

	const chat_input_wrap = lib.click_parent( input_type, false, 'chat-input-wrap', 5 )

	// blank slate

	const options = ['code', 'ascii', 'text', 'poetry']

	const current = chat_input_wrap.getAttribute('data-text-type')

	const modal = new Modal({
		type: 'text-type-choice',
	})

	for( const option of options ){

		const _opt = lib.b('div', false, 'type-option')
		_opt.setAttribute('data-type', option )
		_opt.addEventListener('click', set_type_option )

		MAP.set( _opt, {
			modal,
			chat_input_wrap,
		})

		const img = lib.b('img')
		img.src = `/resource/icons/${option}.png`
		_opt.append( img )

		const label = lib.b('label')
		label.innerText = option
		_opt.append( label )

		modal.content.append( _opt )

	}

	document.body.append( modal.ele )

} // toggle text type





const set_type_option = e => {
	const opt = lib.click_parent( e.target, 'type-option', false, 5 )

	const {
		modal,
		chat_input_wrap,
	} = MAP.get( opt )

	const type = opt.getAttribute('data-type')

	for( const c of lib.syntax_types ){
		chat_input_wrap.classList.remove( c )
	}

	chat_input_wrap.classList.add('is-' + type )
	chat_input_wrap.setAttribute('data-text-type', type )

	modal.close.click()

} // set type option




const pop_join_status = e => {
	const button = lib.click_parent( e.target, 'button', false, 5 )
	const {
		cove,
	} = MAP.get( button )

	const action = button.getAttribute('data-member-action')

	switch( action ){
	case 'join':
		BROKER.publish('SOCKET_SEND', {
			action: 'join_cove_member',
			uuid: cove.uuid,
		})
		break;

	case 'leave':
		BROKER.publish('SOCKET_SEND', {
			action: 'leave_cove_member',
			uuid: cove.uuid,
		})
		break;

	case 'request':
		break;
	default:
		console.warn('invalid join actin', action )
		break;
	}

} // pop join status





// const toggle_code = e => {

// 	const btn = lib.click_parent( e.target, 'button', false, 5 )
// 	const text_type = btn.getAttribute('data-text-type')

// 	const input_wrap = lib.click_parent( btn, false, 'chat-input-wrap', 4 )

// 	const was_selected = btn.classList.contains('selected')


// 	// update button 'selected' class
// 	// - blank slate
// 	const buttons = input_wrap.querySelectorAll('.button.input-action')
// 	for( const button of buttons ){
// 		button.classList.remove('selected')
// 	}

// 	if( was_selected ){
// 		btn.classList.remove('selected')
// 	}else{
// 		btn.classList.add('selected')
// 	}


// 	// then reflect on parent ele for easier access:
// 	// - blank slate
// 	for( const c of ['is-code', 'is-ascii'] ){ // 'is-text'
// 		input_wrap.classList.remove( c )
// 	}
// 	const selected = input_wrap.querySelector('.button.selected')
// 	if( selected ){
// 		input_wrap.classList.add('is-' + text_type )
// 	}

// 	// if( btn.classList.contains('selected') ){
// 	// 	input_wrap.classList.add('is-' + text_type )
// 	// }else{
// 	// 	input_wrap.classList.remove('is-' + text_type )
// 	// }

// 	console.log('toggle-code', {
// 		was_selected,
// 		text_type,
// 	})

// } // toggle code






export default AlcoveInstance