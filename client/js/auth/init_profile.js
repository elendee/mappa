import env from '../env.js?v=78'
import hal from '../hal.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import ui from '../ui.js?v=78'
import * as lib from '../lib.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'
import media_lib from '../media_lib.js?v=78'
import { Modal } from '../Modal.js?v=78'
import Prompt from '../Prompt.js?v=78'
import Spinner from '../Spinner.js?v=78'
import SVGS from '../SVGS.js?v=78'
import USER from '../USER.js?v=78'
import notification_settings from '../notification_settings.js?v=78'





const spinner = new Spinner({
	type: 'svg',
})




// decl

const content = document.querySelector('#content')
const media_upload = document.querySelector('#media-library .button')
const media_library = document.querySelector('#media-library .content')
const notifies = document.querySelectorAll('#notifications input')
const notifications = document.getElementById('notifications')


const FIELD_MAP = {
	email: 'text',
	// slug: 'text',
	handle: 'text',
	// color: 'color',
	password: 'text',
}
const ALLOWED_TYPES = [
	'text', 
	'password', 
	'email', 
	'checkbox', 
	// 'color',
]
// const NO_SHOWS = ['_password']
// const NO_EDITS = ['_email', 'slug'] // 'handle'

content.classList.add('book-contain')






// lib

// --------------------------- 
// single form / field maker 
// --------------------------- 
const map_field = field => {
	if( field == 'slug' ) return 'user id'
	return field.replace('_', '')
}

const build_field_setter = ( args ) => {
	const {
		type, 
		field, 
		data, 
		// trigger_text, 
		// editable
	} = args

	const _data = data || {}

	const field_form = build_field_form( type, field )

	const the_input = field_form.querySelector('input')
	if( field === 'password' ){
		the_input.type = 'password'
	}

	// if( !NO_SHOWS.includes( field ) ){
		the_input.value = _data[ field ] || ''
	// }
	const label = lib.b('label')
	label.innerText = map_field( field )
	field_form.prepend( label )

	field_form.onsubmit = e => {

		e.preventDefault()

		spinner.show()

		fetch_wrap('/action_account', 'post', {
			action: 'set_field',
			data: {
				field: field,
				value: ( the_input.type === 'checkbox' ? the_input.checked : the_input.value ),
			}
		})
		.then( res => {

			if( field === '_password') the_input.value = ''
			
			if( res?.success ){
				// field_form.style.display = 'none'
				// reset.classList.remove('hidden')
				hal('success', 'success', 3000)
			}else{
				hal('error', res?.msg || 'failed to set', 10 * 1000 )
			}
			spinner.hide()
		})
		.catch( err => {
			console.log( err )
			hal('error', 'error', 10 * 1000)
			spinner.hide()
		})

	}

	return field_form

} // build form / field



// --------------------------- 
// single form / field maker for ^^
// --------------------------- 
const build_field_form = ( type, field ) => {
	// const no_edit = NO_EDITS.includes( field )
	if( !ALLOWED_TYPES.includes( type ) ) throw new Error('unhandled form type: ' + type )
	const form = lib.b('form')
	const input = lib.b('input', false)
	input.classList.add('input')
	input.placeholder = ( field || 'enter value here' ).replace('_', '')
	input.type = type
	// if( no_edit ) input.setAttribute('disabled', true)
	form.append( input )
	// if( !no_edit ){
		// form.append( lib.b('br'))
		const submit = lib.b('input', false, 'button')
		submit.type = 'submit'
		submit.value = 'update'
		form.append( submit )		
	// }
	return form 
}




const build_user_section = ( user ) => {

	const user_liner = lib.b('div', 'user-liner')

	for( const field in FIELD_MAP ){
		const datatype = FIELD_MAP[ field ]
		const row = build_field_setter({
			type: datatype, 
			field, 
			data: user, 
		})
		user_liner.append( row )
	}

	return user_liner

}

const build_actions = () => {

	const action_liner = lib.b('div', 'user-liner')

	const actions = lib.b('div', 'account-actions')

	const rm = lib.b('div', false, 'button', 'warning')
	rm.innerText = 'delete account'
	rm.addEventListener('click', () => {

		if( prompt('This will permanently remove your account, messages, and reviews - type "delete" to continue') !== 'delete' ) return;

		fetch_wrap('/action_account', 'post', {
			action: 'remove_account'
		})
		.then( res => {
			if( res.success ){
				hal('success', 'success', 1000)
				setTimeout(()=>{
					location.assign('/')
				}, 1000)
			}else{
				hal( 'error', res?.msg || 'error removing', 5000 )
			}
		})
		.catch( err => {
			console.error( err )
			hal('error', err?.msg || 'error removing', 5000 )
		})
	})
	actions.append( rm )

	action_liner.append( actions )

	return action_liner

}



const build_section = args => {
	const {
		id,
		header,
	} = args

	const wrap = lib.b('div', id, 'user-section', 'column', 'column-2')

	const h3 = lib.b('h3')
	h3.innerText = header
	wrap.append( h3)

	return wrap

}


const set_language_setting = e => {
	const input = lib.click_parent( e.target, 'input', false, 3 )
	const type = input.getAttribute('data-language-setting')

	fetch_wrap('/action_account', 'post', {
		action: 'set_language',
		value: input.value,
		type,
	})
	.then( res => {
		if( !res?.success ) return hal('error', res?.msg || 'failed to set', 5000 )
		hal('success', 'updated', 2000 )
		USER[ type + '_lang' ] = input.value
	})

}








// bind









// init

let res = {
	user: USER,
}
const user = res.user


// -- init the DOM:





// --------------- top wrap; users ---------------

const user_sections = document.getElementById('user-sections')

const user_wrap = build_section({
	id: 'user-wrap',
	header: 'account details',
})
const action_wrap = build_section({
	id: 'user-actions',
	header: 'user actions',
})
const account_places = build_section({
	id: 'account-qr',
	header: 'public details',
})
const profile_settings = build_section({
	id: 'profile-settings',
	header: 'profile settings',
})
const notifications_wrap = build_section({
	id: 'notifications-wrap',
	header: 'notifications',
})

user_sections.append( account_places )
user_sections.append( profile_settings )
user_sections.append( user_wrap )
user_sections.append( notifications_wrap )
user_sections.append( action_wrap )

notifications_wrap.append( notifications )






// ----- user section

// -- public details
const user_link = `${env.PUBLIC_URL}/user/${user?.uuid}`

const user_qr = lib.b('div', false, 'user-qr', 'column', 'column-2')
user_qr.innerHTML = `Your public profile:<br><br>`
fetch_wrap('/action_account', 'post', {
	action: 'account_qr',
	text: user_link,
	output: 'svg', // text / png / svg
	// color_fg, // defaults
	// color_bg, // defaults
	// margin,
}, true )
.then( res => {
	if( !res?.success ) return console.warn('invalid qr res', res )
	const url = `/user/${user.uuid}`
	user_qr.innerHTML += `
	<img src='${res.qr}'>
	<p>
		Same link: <a href='${user_link}'>${user_link}</a>
	</p>`
})
account_places.append( user_qr )

account_places.append( lib.b('br') )
account_places.append( lib.b('br') )
const _uuid_label = lib.b('label')
_uuid_label.innerText = 'user id (used for room invites)'
const uuid = lib.b('input', false, 'input')
uuid.setAttribute('disabled', true )
uuid.value = user.uuid
account_places.append( _uuid_label )
account_places.append( lib.b('br') )
account_places.append( lib.b('br') )
account_places.append( uuid )
account_places.append( lib.b('br') )
account_places.append( lib.b('br') )



// -- profile settings


// - writing language
let blank
/*

	probably can handle this better through auto-detection

const write_lang = lib.build_select({
	label_text: `Your written language - language you are most often writing in.`,
	options: GLOBAL.LANGUAGES.sort((a,b) => {
		return a > b ? 1 : -1
	})
})
blank = lib.b('option')
blank.value = ''
blank.innerText = `(choose a language)`
write_lang.select.prepend( blank )
write_lang.select.setAttribute('data-language-setting', 'written')
write_lang.select.addEventListener('change', set_language_setting )
write_lang.select.value = USER.written_lang || ''
const write_help = lib.build_help({
	Modal,
	expl: `This helps the language service know in advance whether or not it needs to translate your message for others`,
})
write_lang.wrap.append( write_help )
profile_settings.append( write_lang.wrap )

*/


// - reading language
const read_lang = lib.build_select({
	label_text: `Reading language.  Leave default for "don't translate"`,
	options: GLOBAL.LANGUAGES,
})
blank = lib.b('option')
blank.value = ''
blank.innerText = `(Default)`
read_lang.select.prepend( blank )
read_lang.select.setAttribute('data-language-setting', 'reading')
read_lang.select.addEventListener('change', set_language_setting )
read_lang.select.value = USER.reading_lang || ''
const read_help = lib.build_help({
	Modal,
	expl: `When this is selected, the language service will attempt to translate every new message you see.  You will see this translation happen as you scroll.

However, any individual translations you make will take precedence over this.`,
})
read_lang.wrap.append( read_help )
profile_settings.append( read_lang.wrap )










// -- account details
const user_section = build_user_section( user )
user_wrap.append( user_section )






// ----- actions section

const act_section = build_actions()
action_wrap.append( act_section )








// - notifies



// - push

const allow_push = lib.build_checkbox({
	label_text: 'push notifications',
	name: 'allow_push',
})
allow_push.wrap.id = 'allow-push'
const extra = lib.b('div')
extra.innerText = `notifies for DM's and replies`
allow_push.wrap.append( extra )




notification_settings({
	notifications_wrap,
	allow_push,
	notifies,
})