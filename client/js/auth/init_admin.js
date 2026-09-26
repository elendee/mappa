import env from '../env.js'
import ui from '../ui.js'
import * as lib from '../lib.js'
import hal from '../hal.js'
import fetch_wrap from '../fetch_wrap.js'
import GLOBAL from '../GLOBAL.js'
import { Modal } from '../Modal.js'
// import Bot from '../classes/Bot.js'





// const content = document.querySelector('#content')
const results = document.getElementById('admin-content')
const views = document.getElementById('admin-views')

// const ACTIONS = {}









// ---------------------------
// build sections as needed
// ---------------------------
// build sections as needed
// build buttons below and append them into these sections
const user_section = lib.b('div', 'section-user', 'admin-section')
views.append( user_section )

const mod_section = lib.b('div', 'section-mod', 'admin-section')
views.append( mod_section )

const maint_section = lib.b('div', 'section-maint', 'admin-section')
views.append( maint_section )

const misc_section = lib.b('div', 'section-misc', 'admin-section')
views.append( misc_section )


const GUIDES = { // A) default all false
	users: false,
	mod: false,
	backup: false,
	restart: false,
}
for( const key in GUIDES ) GUIDES[key] = lib.b('div', false, 'admin-guide')
// B) and then fill:
GUIDES.users.innerHTML = `
<p>Here is a guide section....</p>
<p>Blocking currently does nothing</p>
`
GUIDES.backup.innerHTML = ``




const build_server_action = ( action, success ) => {
	/*
		action + callback - all logic on server
	*/

	const btn = lib.b('div', false, 'button')
	btn.innerHTML = action.replace(/_/g, ' ')
	btn.addEventListener('click', () => {

		if( action == 'restart' ){
			if( env.PRODUCTION && !confirm('restart server?')) return;
		}

		fetch_wrap('/action_admin', 'post', {
			action,
		})
		.then( res => {
			if( res?.success ){
				success( res )
			}else{
				hal('error', res?.msg || 'failed action', 5000 )
			}
		})
	})

	return btn

}







// ---------------------------
// user section actions
// ---------------------------

// --- list users
const users = build_server_action('users', res => {
	console.log( res )
	results.innerHTML = ''

	results.append( GUIDES.users )

	for( const user of res.results ){
		results.append( build_user( user ) ) // , res.stripe_products
	}
})
user_section.append( users )
user_section.append( lib.b('br') )

// --- logout users
const flush_users = lib.b('div', false, 'button')
flush_users.innerText = 'logout users'
flush_users.addEventListener('click', () => {

	if( !confirm(`This will log out all users, except yourself. 
This is needed when changes to user or session structures are made.  
Continue?`) ) return;

	fetch_wrap('/action_admin', 'post', {
		action: 'flush_users',
	})
	.then( res => {
		if( res?.success ){
			hal('success', 'flushed', 5000 )
		}else{
			hal('error', res?.msg || 'error', 15 * 1000 )
		}
	})
	
})
user_section.append( flush_users )
user_section.append( lib.b('br') )

const view_sessions = lib.b('div', false, 'button')
view_sessions.innerText = 'view sessions'
view_sessions.addEventListener('click', async() => {

	// let cursor = 0

	// let returned = Infinity

	// let c = 0

	// while( c < 10 && returned > 0 ){
	// 	c++
	// const {
	// 	matching,
	// 	add_sessions,
	// 	anon_sessions,
	// } = await fetch_sessions({
	// 	// cursor: String( cursor ),
	// })

	let res = await fetch_wrap('/action_admin', 'post', {
		action: 'view_sessions',
		// cursor,
		// limit: 1000,
	})

	if( !res?.success ) return hal('error', res?.msg || 'error view sessions', 5000 )

	// const {
	// 	checked,
	// 	matching,
	// 	sample,
	// 	total,
	// } = res?.res

	hal('standard', `${res.anon_sessions} anon sessions`, 5000 )

	const {
		logged_sessions,
	} = res

	// const anon_len = anon_sessions?.length || 0
	// const add_len = add_sessions?.length || 0

	// returned = matching?.length || 0
	// anon_len + add_len

	// cursor += returned
	// debugger

	results.innerHTML = ''

	for( const session of logged_sessions ){
		const wrap = render_session({
			session,
		})
		results.append( wrap )
	}

	// hal('standard', 'skipping ' + anon_len + ' sessions', 5000 )

	// }

})
user_section.append( view_sessions )
user_section.append( lib.b('br') )

// --- end users



const render_session = args => {
	const {
		session,
	} = args
	const {
		data,
	} = session
	const {
		USER
	} = data

	// debugger

	const size = 4
	const wrap = lib.b('div', false, 'session-result', 'row')
	wrap.innerHTML = `
<div class='user-id column column-${size}' title='user id'>${USER?.id}</div>
<div class='user-uuid column column-${size}' title='user uuid'>${USER?.uuid}</div>
<div class='user-email column column-${size}' title='user email'>${USER?.email}</div>
<div class='user-handle column column-${size}' title='user handle'>${USER?.handle}</div>`
	if( !USER?.id ) wrap.classList.add('anon')

	return wrap

} // render-session



// const fetch_sessions = async( args ) => {
// 	const {
// 		// cursor,
// 	} = args

// 	let res = await fetch_wrap('/action_admin', 'post', {
// 		action: 'view_sessions',
// 		// cursor,
// 		limit: 1000,
// 	})

// 	if( !res?.success ) return hal('error', res?.msg || 'error view sessions', 5000 )

// 	// const {
// 	// 	checked,
// 	// 	matching,
// 	// 	sample,
// 	// 	total,
// 	// } = res?.res

// 	const {
// 		logged_sessions,
// 	} = res

// 	// let _cursor = res.cursor

// 	results.innerHTML = ''

// 	// const anon_sessions = []
// 	// const add_sessions = []

// 	for( const obj of logged_sessions || [] ){
// 		const {
// 			// email, // derived from USER.email anyway on server
// 			data,
// 		} = obj
// 		const {
// 			USER,
// 			cookie,
// 		} = data

// 		// if( !USER?.id ){
// 		// 	anon_sessions.push( data )
// 		// }else{
// 		// 	add_sessions.push( data )
// 		// }
// 	}

// 	console.log('fetch-sessions', {
// 		res
// 	})

// 	return {
// 		anon_sessions,
// 		add_sessions,
// 		matching,
// 	}

// } // fetch-sessions
















// ---------------------------
// info sections
// ---------------------------

const build_svg = ( text, key, uber_key ) => {
	const wrap = lib.b('div', false, 'svg-wrap')
	wrap.innerHTML = text
	const name = lib.b('div', false, 'svg-name')
	name.innerHTML = uber_key ? `<span>${ uber_key }</span> ${ key }` : key
	wrap.append( name )
	return wrap
}

// --- svgs
const svgs = build_server_action( 'svgs', res => {

	results.append( GUIDES.svgs )

	if( res?.success ){
		console.log( res )
		for( const key in res.svgs ){
			if( !key || !res.svgs[key] ){
				console.error('wot', key )
				continue
			}
			if( typeof res.svgs[key] === 'object' ){
				const obj = res.svgs[key]
				for( const k in obj ){
					if( !key || !obj[k] ){
						console.error('wot', obj )
					}
					results.append( build_svg( obj[k], k, key ) )
				}
			}else{
				results.append( build_svg( res.svgs[key], key ) )
			}
		}
	}else{
		hal('error', res?.msg || 'error backing up', 10 * 1000 )
		console.log( res )
	}
})
maint_section.append( svgs )
maint_section.append( lib.b('br') )
// --- end svgs










// ---------------------------
// maintentance section actions
// ---------------------------

// --- backups
const backup = build_server_action( 'backup', res => {

	results.append( GUIDES.backups )

	if( res?.success ){
		hal('success', res.msg || 'success backing up', 10 * 1000 )
	}else{
		hal('error', res?.msg || 'error backing up', 10 * 1000 )
		console.log( res )
	}
})
maint_section.append( backup )
maint_section.append( lib.b('br'))
// --- end backups

// --- restart 
const restart = build_server_action( 'restart', res => {

	results.append( GUIDES.restart )

	if( res?.success ){
		hal('success', res.msg || 'success restarting', 10 * 1000 )
	}else{
		hal('error', res?.msg || 'error restarting', 10 * 1000 )
		console.log( res )
	}
})
maint_section.append( restart )
maint_section.append( lib.b('br'))
// --- end restart


const reddit_subs = ['fantasy', 'books', 'horrorlit', 'suggestmeabook', 'sideproject', 'webapps',
'whatsthatbook', 'booksuggestions', 'bookshelf', 'bookshelvesdetective', 'bookclub', 'classicbookclub',
'nonfictionbookclub']






const build_reddit_inputs = () => {

	const sub = lib.b('input', false, 'input', 'subreddit')
	sub.placeholder = 'r/[subreddit]'
	sub.value = localStorage.getItem('hil-reddit-sub') || ''

	const search = lib.b('input', false, 'input', 'search')
	search.placeholder = 'search term'
	search.value = localStorage.getItem('hil-reddit-search') || ''

	return {
		sub,
		search,
	}

}








// ---------------------------
// lib
// ---------------------------

const pop_notes = e => {
	const notes = e.target
	const modal = new Modal({
		type: 'notes',
		header: 'flag notes'
	})
	const content = lib.b('div', false, 'note-content')
	content.innerHTML = notes.getAttribute('data-full')
	modal.content.append( content )
	document.body.append( modal.ele )
}


const remove_flag = e => {
	const btn = e.target
	const id = Number( btn.parentElement.getAttribute('data-flag-id') )

	if( !confirm('remove flag?')) return;

	fetch_wrap('/action_admin', 'post', {
		action: 'remove_flag',
		id,
	})
	.then( res => {
		if( res?.success ){
			hal('success', res?.msg || 'success', 5 * 1000 )
			btn.parentElement.remove()
		}else{
			hal('error', res?.msg || 'error', 10 * 1000 )
		}
	})
}

const user_fields = {
	email: 'text',
	handle: 'text',
	confirmed: 'text',
	// color: 'text',
	reset_time: 'date',
	created: 'date',
	edited: 'date',
}

const build_user = ( user_data ) => {

	// console.log('building', user_data )

	const wrapper = lib.b('div', false, 'user-row')
	if( user_data.blocked ) wrapper.classList.add('blocked')
	// name / handle - boxed so it can take color
	const name = lib.b('div', false, 'column', 'column-4')
	if( user_data.color ){
		name.style.color = user_data.color
		name.style['font-weight'] = 'bold'
	}
	const name_box = lib.b('div', false, 'name-box')
	name_box.innerHTML = user_data.handle
	name.append( name_box )
	wrapper.append( name )
	// email
	const email = lib.b('div', false, 'user-email', 'column', 'column-4')
	email.innerText = user_data.email
	wrapper.append( email )

	// slug
	const uuid = lib.b('div', false, 'user-uuid', 'column', 'column-4')
	uuid.innerHTML = `<a href='/user/${ user_data.uuid }'>${ user_data.uuid }</a>`
	wrapper.append( uuid )

	// edited
	const edited = lib.b('div', false, 'user-edited', 'column', 'column-4')
	edited.title = 'last edited'
	edited.innerHTML = `${ new Date( user_data.edited ).toLocaleString().split(',')[0] }`
	wrapper.append( edited )

	wrapper.addEventListener('click', e => {

		if( e.target.nodeName === 'A' ){
			// e.preventDefault()
			return;
		}

		if( e.target.type === 'checkbox') return

		const modal = new Modal({	
			type: 'user-edit',
		})

		console.log('blocked.. ?', user_data.email, user_data.blocked )

		// basic
		const basic_data = lib.b('div', false, 'user-basic-data')
		// basic_data.innerHTML = `<pre>${ JSON.stringify( user, false, 2 )  }</pre>`
		for( const field in user_fields ){
			const row = lib.b('div', false, 'user-data-row')
			if( field === 'color'){
				// row.style.color = user_data[ field ]
				// row.style.background = lib.offset_color( user_data.color, true )
				row.style.display = 'inline-block'
			}
			const field_type = user_fields[field]
			if( field_type === 'text' ){
				row.innerText = `${ field }: ${user_data[ field ]}`
			}else if( field_type === 'date' ){
				row.innerText = `${field}: ${new Date( user_data[ field ] ).toLocaleString()}`
			}
			basic_data.append( row )
		}
		modal.content.append( basic_data )

		const block = lib.b('div', false, 'button', 'sensitive-action')
		block.innerText = user_data.blocked ? 'unblock user' : 'block user'
		block.addEventListener('click', () => {

			const is_blocked = !!wrapper.classList.contains('blocked')

			fetch_wrap('/action_admin', 'post', {
				action: 'block_user',
				slug: user_data.slug,
				state: !is_blocked,
			})
			.then( res => {
				if( res?.success ){
					const id = user_data.handle + ' / ' + user_data.email
					if( is_blocked ){
						hal('success', 'unblocked ' + id, 5000 )
						wrapper.classList.remove('blocked')
						block.innerText = 'block user'
					}else{
						hal('success', 'blocked ' + id, 5000 )
						wrapper.classList.add('blocked')
						block.innerText = 'unblock user'
					}
				}else{
					hal('error', res?.msg || 'error blocking', 15 * 1000 )
				}
			})
			.catch( err => {
				console.error( err )
				hal('error', err?.msg || 'error blocking', 15 * 1000 )
			})
		})
		modal.content.append( block )

		document.body.append( modal.ele )
	})
	return wrapper
} // build user







