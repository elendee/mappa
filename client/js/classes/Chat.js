import env from '../env.js'
import GLOBAL from '../GLOBAL.js?v=78'
import * as lib from '../lib.js?v=78'
// import popups from '../shared_popups.js?v=78'
import Model from './Model.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import BROKER from '../EventBroker.js?v=78'
import USER from '../USER.js?v=78'





const CHAT_MAP = new Map()

// let do_log
// setTimeout(() => {
// 	do_log = true
// }, 2000 )

class Chat {

	constructor( init, anon_svg ){

		init = init || {}
		
		// fill
		for( const key in init ){
			this[ key ] = init[ key ]
		}

	}

	build( args ){
		const {
			is_user,
		} = args || {}

		const wrap = lib.b('div', false, 'chat-ele')
		this.wrap = wrap
		wrap.setAttribute('data-uuid', this.uuid )
		wrap.setAttribute('data-og-value', this.value )

		if( this.reply_uuid ){
			wrap.setAttribute('data-awaiting-reply-uuid', this.reply_uuid )
		}

		const value = lib.b('div', false, 'chat-value')
		this.value_ele = value // for external calls..
		value.textContent = this.value

		if( is_user ){

			wrap.classList.add('is-user')
			const rm = lib.b('div', false, 'button', 'rm', 'hover-action')
			rm.innerHTML = '&times;'
			rm.addEventListener('click', remove_chat )
			wrap.append( rm )

			const syntax = lib.b('div', false, 'button', 'syntax', 'hover-action')
			let _slug
			if( this.is_code ){
				_slug = 'code.png'
			}else if( this.is_ascii ){
				_slug = 'ascii.png'
			}else{
				_slug = 'code.png'
			}
			syntax.innerHTML = `<img src='/resource/icons/${_slug}'>`
			syntax.addEventListener('click', pop_syntax )
			CHAT_MAP.set( syntax, {
				chat: this,
				wrap,
				value_ele: value,
			})
			wrap.append( syntax )

		}

		const sender = lib.b('div', false, 'chat-sender')
		const s_uuid = this.sender?.uuid || this.sender_uuid
		sender.setAttribute('data-sender-uuid', s_uuid )

		const _send = lib.b('div', false, 'sender-name')
		const link_ele = this.sender?.uuid ? 'a' : 'div'
		const link = lib.b( link_ele, false, 'sender-link')
		link.innerText = this.sender?.handle || this.sender_handle || 'anon'
		if( this.sender?.uuid ){
			link.href = `/user/${this.sender?.uuid}`
		}else{
			// dead link
		}
		_send.append( link )
		sender.append( _send )
		wrap.append( sender )

		const created = lib.b('div', false, 'chat-created')
		created.setAttribute('data-value', this.created )
		created.innerText = lib.auto_date( this.created )
		sender.append( created )

		wrap.append( value )

		// restore if exists
		const _storage = localStorage.getItem('alcoves_chat_lang_' + this.uuid )

		if( _storage ){

			try{

				const {
					language,
					stamp
				} = JSON.parse( _storage )

				// nonce
				wrap.setAttribute('data-desired-language', language )

			}catch( err ){
				console.error({
					err,
					_storage,
				})

				// prevent from keep happening:
				delete localStorage['alcoves_chat_lang_' + this.uuid ]

			}

		}else if( USER.reading_lang ){

			// call this on debounce only !!

			wrap.setAttribute('data-desired-language', USER.reading_lang )

		}

		// const {
		// 	trans,
		// } = 
		this.render_syntax({
			ele: wrap,
		})

		this.render_misc_actions({
			ele: wrap,
			is_user,
		})

		return wrap

	} // build


	render_misc_actions( args ){
		const {
			ele,
			is_user
		} = args

		if( !is_user ){

			const reply = lib.b('div', false, 'button', 'reply', 'hover-action')
			reply.innerHTML = `<img src='/resource/icons/reply.png'>`
			reply.addEventListener('click', reply_chat )
			ele.append( reply )

			CHAT_MAP.set( reply, {
				chat: this,
			})

		}

	}


	render_syntax( args ){
		const {
			ele,
		} = args

		const _types = JSON.parse( JSON.stringify( lib.syntax_types ) )
		_types.splice( _types.indexOf('is-text'), 1 )

		// blank slate
		for( const syntax of _types ){
			ele.classList.remove( syntax )
		}

		// 
		if( this.is_code ){

			ele.classList.add('is-code')

		}else if( this.is_ascii ){

			ele.classList.add('is-ascii')

		}else if( this.is_poetry ){

			ele.classList.add('is-poetry')

		}else{

			const extant = ele.querySelector('.translate')
			if( !extant ){

				const trans = lib.b('div', false, 'button', 'translate', 'hover-action')
				trans.innerHTML = `<img src='/resource/icons/languages.png'>`
				trans.addEventListener('click', pop_translate )
				ele.append( trans )

				CHAT_MAP.set( trans, {
					chat: this,
					wrap: ele,
					value_ele: this.value_ele,
				})

			}

		}

	} // render syntax


	async translate( args ){
		const {
			language,
		} = args

		console.log('translating....', {
			language 
		})

		if( this.is_code ) return;
		if( this.is_ascii ) return;

		let res = await _fetch_translation({
			language,
			chat: this,
			value_ele: this.value_ele,
			is_global: false,
		})

	} // translate



	async get_reply( args ){
		const {
			// reply_uuid,
			caller,
		} = args

		console.log('get-reply', {
			caller,
		})

		if( !this.reply_uuid ) return console.warn('no reply-uuid for chat')

		const reply_preview = lib.b('div', false, 'chat-reply')
		this.wrap.prepend( reply_preview )

		reply_preview.innerText = '↱ fetching...'

		let res = await fetch_wrap('/action_main', 'post', {
			action: 'get_chat',
			uuid: this.reply_uuid,
		})

		const _value = res.value?.value || '-'

		reply_preview.innerText = `↱ replying to: ${lib.abbreviate( _value, 40, 'char' )}`

		if( !res?.success ) return console.warn( 'error getting reply', res )

	} // get reply



	render_sender_viz( args ){
		const {
			ele,
		} = args

		const previous = ele.previousElementSibling
		if( !previous ) return;

		const previous_user = previous.querySelector('.chat-sender').getAttribute('data-sender-uuid')
		if( previous_user === this.sender?.uuid ){
			const time = previous.querySelector('.chat-created').getAttribute('data-value')
			if( this.created - time < lib.times.hour ){
				ele.classList.add('redundant-sender')
				// style.opacity = 0
				// querySelector('.chat-sender')
			}else{
				// ele.classList.add('')
			}
		}

	} // render sender viz



} // Chat





const remove_chat = e => {
	const button = lib.click_parent( e.target, 'button', false, 5 )
	const chat = lib.click_parent( button, 'chat-ele', false, 5 )
	if( !confirm('squash chat?')) return;
	BROKER.publish('SOCKET_SEND', {
		action: 'remove_chat',
		uuid: chat.getAttribute('data-uuid')
	})
}





const pop_translate = e => {

	const btn = lib.click_parent( e.target, 'button', false, 3 )

	const modal = new Modal({
		type: 'translate',
	})

	modal.make_columns()

	const expl = lib.b('div')
	expl.innerHTML = `
<p>Select a language.</p>
<p>Only you will see the translation.</p>
<p>Chats take a few seconds to translate the first time, but are instant afterwards.</p>`
	modal.right_panel.append( expl )

	const {
		chat,
		wrap,
		value_ele,
	} = CHAT_MAP.get( btn )

	modal.content.append( lib.b('br') )

	const select = lib.b('select', false, 'input')
	const blank = lib.b('option')
	blank.innerText = '(none)'
	blank.value = ''
	select.append( blank )
	GLOBAL.LANGUAGES.sort((a,b) => {
		return a > b ? 1 : -1
	})
	for( const arr of GLOBAL.LANGUAGES ){
		const [ lang ] = arr
		const opt = lib.b('option')
		opt.value = lang
		opt.innerText = lang
		select.append( opt )
		if( USER.reading_lang === lang ) opt.selected = true
	}
	modal.left_panel.append( select )

	modal.left_panel.append( lib.b('br') )
	modal.left_panel.append( lib.b('br') )

	const actions = lib.b('div', false, 'actions')
	modal.left_panel.append( actions )

	const submit = lib.b('div', false, 'button')
	submit.innerText = 'translate'
	submit.addEventListener('click', do_translate )
	actions.append( submit )
	actions.append( lib.b('br') )

	const check = lib.build_checkbox({
		label_text: 'use on all chats',
		name: 'reading_language',
		inline: true,
	})
	actions.append( check.wrap )
	if( USER.reading_lang ) check.input.checked = true

	CHAT_MAP.set( actions, {
		chat,
		wrap,
		value_ele,
		use_global_input: check.input,
	})

	modal.left_panel.append( lib.b('br') )
	modal.left_panel.append( lib.b('br') )
	modal.left_panel.append( lib.b('br') )
	modal.left_panel.append( lib.b('br') )

	const restore = lib.b('div', false, 'button', 'restore-text')
	restore.innerText = 'restore original text'
	restore.addEventListener('click', restore_text )
	modal.left_panel.append( restore )

	document.body.append( modal.ele )

} // pop translate



const pop_syntax = e => {
	const btn = lib.click_parent( e.target, 'button', false, 4 )

	const {
		chat,
		wrap,
		value_ele,
	} = CHAT_MAP.get( btn )

	const modal= new Modal({
		type: 'pop-syntax',
	})

	const expl = lib.b('div')
	expl.innerText = `Set the post type:`
	modal.content.append( expl )

	const types = {
		text: {
			slug: 'text.png',
		},
		ascii: {
			slug: 'ascii.png',
		},
		code: {
			slug: 'code.png',
		}
	}

	for( const key in types ){
		const icon = lib.b('div', false, 'icon-choice', 'icon')
		icon.setAttribute('data-syntax-type', key )
		icon.setAttribute('data-chat-uuid', chat.uuid )
		icon.innerHTML  = `<img src='/resource/icons/${types[key].slug}'>`
		icon.addEventListener('click', set_syntax_type )
		modal.content.append( icon )
	}

	document.body.append( modal.ele )

} // pop syntax



const set_syntax_type = e => {
	const btn = lib.click_parent( e.target, 'icon-choice', false, 4 )

	const uuid = btn.getAttribute('data-chat-uuid')
	const type = btn.getAttribute('data-syntax-type')

	BROKER.publish('SOCKET_SEND', {
		action: 'set_syntax_type',
		uuid,
		type,
	})

	if( USER.handle == 'koko' || USER.handle == 'multy' ){
		hal('standard', uuid + '<br>' + type, 5000 )
	}

	const modal = lib.click_parent( btn, 'pop-syntax', false, 5 )
	const close = modal.querySelector('.modal-close')
	if( close ) close.click()

} // set syntax type







const do_translate = async( e ) => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )
	const content = lib.click_parent( btn, 'modal-content', false, 5 )
	const actions = content.querySelector('.actions')
	// btn.parentElement

	const {
		chat,
		wrap,
		value_ele,
		use_global_input,
	} = CHAT_MAP.get( actions )

	const selected = content.querySelector('select').value?.trim()

	const modal = lib.click_parent( btn, 'modal', false, 10 )

	// if( !selected ) return hal('error', 'must select a language', 2000 )
	if( !value_ele?.innerText?.trim() ) return hal('error', 'no chat text', 2000 )

	// async user setting; nothign depends on this
	if( use_global_input?.checked ){
		fetch_wrap('/action_account', 'post', {
			action: 'set_reading_lang',
			selected,
		})
		.then( res => {
			if( !res?.success ) console.error('err setting user language', res )
			USER.reading_lang = selected
			
			BROKER.publish('SET_VIEWPORT_TRANSLATIONS')

		})
	}

	// the actual translation
	let res = await _fetch_translation({
		language: selected,
		chat,
		value_ele,
		is_global: use_global_input,
	})

	const close = modal.querySelector('.modal-close')
	close.click()

} // do translate






const _fetch_translation = async( args ) => {
	const {
		language,
		chat,
		value_ele,
		is_global,
	} = args || {}

	if( !lib.is_logged ) return;

	let res = await fetch_wrap('/action_main', 'post', {
		action: 'translate_text',
		language,
		chat_uuid: chat?.uuid,
	}, true )

	if( !res?.success ) return hal('error', res?.msg || 'error translating', 5000 )

	console.log('first translation res', { 
		res,
	})

	const {
		translation,
		in_progress,
		query_uuid,
	} = res

	if( in_progress ){

		hal('success', 'translation in progress', 2000 )
		value_ele.setAttribute('data-query-uuid', query_uuid )
		value_ele.classList.add('is-translating')

		let c = 0
		let polling = setInterval(() => {

			// can always click again, so clear conservatively
			c++
			if( c > 20 ) return clearInterval( polling );

			fetch_wrap('/action_main', 'post', {
				action: 'poll_translation',
				chat_uuid: chat?.uuid,
				language,
			}, true )
			.then( res => {
				if( res?.success ){
					if( res.translation ){

						set_element_translation({
							chat,
							ele: value_ele,
							content: res.translation.content,
							language,
							use_local_storage: !!is_global,
						})

						clearInterval( polling )

					}else{
						//
					}
				}else{
					//
				}
			})

		}, 1500 )

	}else if( translation ){

		set_element_translation({
			chat,
			ele: value_ele,
			content: translation.content,
			language,
			use_local_storage: !!is_global,
		})

	}else{
		console.error('invalid translation res', res )
	}

} // fetch-translation




const set_element_translation = args => {
	const {
		chat,
		ele,
		content,
		language,
		use_local_storage,
	} = args

	ele.innerText = content || `(no translation; ${language})`
	ele.classList.remove('is-translating')

	// use local storage for individual selections; priority over the global on / off toggle
	if( use_local_storage ){
		localStorage.setItem('alcoves_chat_lang_' + chat.uuid, JSON.stringify({
			language,
			stamp: Date.now(),
		}))		
	}

} // set element translation





const restore_text = e => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )
	const content = lib.click_parent( btn, 'modal-content', false, 5 )
	const actions = content.querySelector('.actions')

	const {
		chat,
		wrap,
		value_ele,
	} = CHAT_MAP.get( actions )

	value_ele.innerText = wrap.getAttribute('data-og-value')

	// const reading_lang = actions.querySelector('input[name="reading_language"]')
	// if( reading_lang.checked ){
	// 	delete USER.reading_lang
	// 	hal('success', 'default language reset - refresh page to reload chats', 5000 )
	// }

	delete localStorage['alcoves_chat_lang_' + chat.uuid ]

	const modal = lib.click_parent( btn, 'modal', false, 5 )
	const close = modal.querySelector('.modal-close')
	close.click()

	// console.log('restore', chat )	

} // restore text


const reply_chat = e => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )

	const {
		chat,
	} = CHAT_MAP.get( btn )

	BROKER.publish('PREVIEW_CHAT_REPLY', {
		chat
	})

}








export default Chat