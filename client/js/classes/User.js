import env from '../env.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'
import * as lib from '../lib.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
// import popups from '../shared_popups.js?v=78'
import Model from './Model.js?v=78'




const pop_contact = e => {
	const wrap = lib.click_parent( e.target, 'user-wrap', false, 4 )
	const slug = wrap.getAttribute('data-slug')
	const handle = wrap.getAttribute('data-handle')
	popups.pop_contact({
		slug,
		handle,
	})
}




const USER_MAP = new Map()


class User extends Model {

	constructor( init, anon_svg ){

		super( init )

		init = init || {}
		// fill
		for( const key in init ){
			this[ key] = init[ key ]
		}

		this.anon_svg = anon_svg

		this.profile = init.profile

	}

	gen_user_link( is_self ){

		const wrap = lib.b('div', false, 'user-link')

		let link
		if( !this.slug && !this.handle ){
			link = lib.b('div')
			link.innerText = '(no user)'
			return link
		}
		link = lib.b('a')
		link.href = '/user/' + this.slug
		link.innerHTML = `${ this.handle || '(anon)' }${ is_self ? ' (you)' : '' }`
		wrap.append( link )

		return wrap

	} // gen user link

	output_ascii( args ){
		const {
			include_contact, 
			is_self,
		} = args || {}

		const wrap = lib.b('div', false, 'user-wrap')
		wrap.setAttribute('data-slug', this.slug )
		wrap.setAttribute('data-handle', this.handle )

		// link / title
		const handle = lib.b('h4', false, 'user-handle', 'user-summary-field')
		const link = this.gen_user_link( is_self )
		handle.append( link )
		wrap.append( handle )

		const cover = lib.b('div', false, 'user-ascii', 'user-ascii-display', 'tiny')
		cover.innerText = this.user_ascii || `void`

		wrap.append( cover )

		if( is_self ){

			const edit_cover = lib.b('div', false, 'button', 'edit-cover')
			edit_cover.innerText = 'edit'
			edit_cover.addEventListener('click', edit_ascii )
			wrap.append( edit_cover )

			const help = lib.build_help({
				Modal,
				html: `Draw your own ascii portrait.<br>
You can use to <a target='_blank' href='https://www.asciiart.eu/ascii-draw-studio/app'>the asciiart.eu app</a> to test.<br>
Use a 28 x 18 grid to match ${GLOBAL.SITE_TITLE} size.`,
			})
			wrap.append( help )

			USER_MAP.set( edit_cover, {
				user: this,
			})

		}

		return wrap

	} // output profile

	output_page( args ){
		const {
			include_contact,
			is_self,
		} = args

		const wrap = lib.b('div', false, 'user-page')
		wrap.setAttribute('data-user-uuid', this.uuid )
		wrap.setAttribute('data-user-handle', this.handle )

		const profile = this.output_ascii( args )
		wrap.append( profile )
		wrap.append( lib.b('br') )
		wrap.append( lib.b('br') )

		const uuid_l = lib.b('label')
		uuid_l.innerText = 'uuid (used for room invites)'
		wrap.append( uuid_l )
		wrap.append( lib.b('br') )
		const uuid = lib.b('input', false, 'user-uuid', 'input')
		uuid.setAttribute('disabled', true )
		uuid.value = this.uuid
		wrap.append( uuid )

		wrap.append( lib.b('br') )
		wrap.append( lib.b('br') )

		if( include_contact ){
			const contact = lib.b('a', false, 'contact', 'button')
			contact.href = `/contact/${this.uuid}`
			contact.innerText = `chat`
			wrap.append( contact )

			wrap.append( lib.b('br') )
			wrap.append( lib.b('br') )

		}

		return wrap

	} // output page


	static build_ascii_editor( args ){
		const {
			user_ascii,
		} = args || {}

		const textarea = lib.b('textarea', false, 'input', 'user-ascii-editor', 'user-ascii-display')
		textarea.value = lib.decodeHtml( user_ascii || '' )

		textarea.addEventListener('keydown', editor_keydown )

		return {
			textarea,
		}

	} // build ascii editor


	static build_listing = args => {
		const {
			USER,
			cove,
			user_data,
			// is_present,
		} = args

		const is_self = USER?.uuid === user_data?.uuid && user_data

		const {
			friends_accepted,
			is_owner,
		} = user_data || {}

		const listing = lib.b('div', false, 'alcove-user')
		listing.setAttribute('data-user-uuid', user_data.uuid )
		listing.setAttribute('data-cove-uuid', cove.uuid )

		// if( is_present ){
		// 	listing.classList.add('is-present')
		// }

		const dot = lib.b('div', false, 'status-dot')
		listing.append( dot )

		// left icon; friends
		if( Array.isArray( friends_accepted ) ){

			const friend_state = lib.b('div', false, 'friend-state')
			friend_state.setAttribute('data-friend-accepted', JSON.stringify( friends_accepted ) )

			const acc_self = friends_accepted.includes( USER.uuid )
			const acc_othr = friends_accepted.includes( user_data.uuid )
			const is_pending = ( acc_self && !acc_othr ) || ( acc_othr && !acc_self )
			const is_confirmed = acc_self && acc_othr

			USER_MAP.set( friend_state, {
				cove,
				friends_accepted,
				acc_self,
				acc_othr,
				user_data,
			})

			if( is_pending ){

				listing.classList.add('friend-pending')

				if( !acc_othr ) listing.classList.add('is-other')
				if( acc_othr ){
					friend_state.innerHTML = lib.build_icon( GLOBAL.ICONS.check )
					friend_state.addEventListener('click', accept_friend )
				}else if( acc_self ){
					friend_state.innerHTML = lib.build_icon( GLOBAL.ICONS.clock )
					friend_state.addEventListener('click', pop_friend_modal )
				}

			}else if( is_confirmed ){

				listing.classList.add('friend-confirmed')

				friend_state.title = 'confirmed'
				friend_state.innerHTML = lib.build_icon( GLOBAL.ICONS.user )
				friend_state.addEventListener('click', accept_friend )

			}else{

				//

			}

			listing.append( friend_state )

		}

		// notifies
		if( user_data.notify_count ){
			const notifies = lib.b('div', false, 'notifies')
			notifies.innerText = user_data.notify_count || ''
			listing.append( notifies )
		}

		// name / link
		const user_link = lib.b('a', false, 'link')
		user_link.href = `/user/${user_data.uuid}`
		user_link.innerText = user_data.handle
		listing.append( user_link )

		if( is_self ){
			user_link.innerText += ' (you)'
		}

		// owner (if a room userlist)
		if( is_owner ){
			const owner = lib.b('div', false, 'icon')
			owner.innerHTML = `<img src='/resource/icons/crown.png'>`
			listing.append( owner )
			listing.classList.add('is-owner')
		}

		// remove
		const rm = lib.b('div', false, 'button', 'rm')
		rm.innerHTML = '&times;'
		rm.addEventListener('click', remove_user_listing )
		listing.append( rm )

		return listing

	} // build listing



} // User



const editor_keydown = e => {
	if( e.key === 'Tab' ){
		e.preventDefault();
		const ta = e.target;
		const start = getCaretPosition(ta);
		ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(start);  // 4 spaces
		setCaretPosition(ta, start + 4);  // Cursor after spaces
	}
};

function getCaretPosition( el ){
	return el.selectionStart || 0;
}

function setCaretPosition( el, pos ){
	el.selectionStart = pos;
	el.selectionEnd = pos;
	el.focus();
}




const edit_ascii = e => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )
	const {
		user,
	} = USER_MAP.get( btn )

	const modal = new Modal({
		type: 'edit-ascii',
	})

	const {
		textarea,
	} = User.build_ascii_editor({
		user_ascii: user.user_ascii,
	})

	modal.content.append( textarea )

	const save = lib.b('div', false, 'button')
	save.innerText = 'save'
	save.addEventListener('click', () => {
		fetch_wrap('/action_account', 'post', {
			action: 'save_ascii',
			value: textarea.value,
		})
		.then( res => {
			if( !res?.success ) return hal('error', res?.msg || 'error saving', 5000 )
			hal('success', 'saved', 3000 )
		})
	})
	modal.content.append( lib.b('br') )
	modal.content.append( save )

	document.body.append( modal.ele )

} // edit ascii 






const accept_friend = e => {
	const _state = lib.click_parent( e.target, 'friend-state', false, 5 )
	const listing = lib.click_parent( _state, 'alcove-user', false, 4 )

	const {
		cove,
		friends_accepted,
		acc_self,
		acc_othr,
		user_data,
	} = USER_MAP.get( _state )

	const is_accept = !listing.classList.contains('friend-confirmed')

	const verb = is_accept ? 'Accept' : 'Revoke'

	if( !confirm(`${verb} friend request from ${user_data.handle}?`)) return;

	fetch_wrap('/action_main', 'post', {
		action: 'accept_friend',
		user_uuid: user_data?.uuid,
		state: is_accept
	})
	.then( res => {
		if( !res?.success ) return hal('error', res?.msg || 'error accepting', 5000 )
		hal('success', 'success', 5000 )
		listing.classList.remove('friend-pending')
		listing.classList.add('friend-confirmed')
	})

}

const pop_friend_modal = e => {
	const _state = lib.click_parent( e.target, 'friend-state', false, 5 )
	const {
		cove,
		friends_accepted,
		acc_self,
		acc_othr,
		user_data,
	} = USER_MAP.get( _state )

	const modal = new Modal({
		type: 'friend-pop',
	})

	const expl = lib.b('div')
	expl.innerText = `Waiting on ${user_data?.handle} to accept`
	modal.content.append( expl )

	document.body.append( modal.ele )

}



const remove_user_listing = async( e ) => {

	const listing = lib.click_parent( e.target, 'allowed-user', false, 5 )

	const uuid = listing.getAttribute('data-user-uuid')
	const cove_uuid = listing.getAttribute('data-cove-uuid')

	let res = await fetch_wrap('/action_main', 'post', {
		action: 'remove_user_listing',
		user_uuid: uuid,
		cove_uuid,
	})

	if( !res?.success ) return hal('error', res?.msg || 'error removing', 5000 )

	hal('success', 'removed', 2000 )

	listing.remove()

} // remove user listing








export default User
