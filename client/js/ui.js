import env from './env.js'
import hal from './hal.js'
import GLOBAL from './GLOBAL.js'
import {
	click_parent,
	b,
	is_logged,
	is_admin,
	make_debounce,
	random_range,
} from './lib.js'
import auth from './auth/auth.js'
import BROKER from './EventBroker.js'
// import popups from './shared_popups.js' // just to init






const toggle = document.getElementById('mobile-toggle')
// const global_svgs = document.getElementById('global-svgs')
const themes = document.querySelectorAll('#header .theme')
const dark_mode = document.getElementById('dark-toggle')





if( is_logged ) document.body.classList.add('is-logged')
if( is_admin ) document.body.classList.add('is-admin')





const clickoff_popup = e => {

	const clicked_modal = click_parent( e.target, 'modal-content', false, 20 )

	if( clicked_modal ){

		//

	}else if( window.innerWidth < 800 && !document.body.classList.contains('menu-hidden') ){ // check for close menu

		if( click_parent( e.target, false, 'header', 10 ) ){

			//

		}else if( click_parent( e.target, false, 'mobile-toggle', 10 ) ){

			//

		}else{

			BROKER.publish('UI_CLOSE', {
				e: e,
				is_click: true
			})

		}

	}else{ // any other conditions ?

		// 

	}

} // clickoff popup



const ui_close = event => {
	const { 
		e, 
		is_esc, 
		is_click 
	} = event

	if( is_esc || is_click ){

		const modals = document.querySelectorAll('.modal')
		let latest = 0
		let closer
		for( const modal of modals ){
			if( modal.getAttribute('data-created') > latest && !modal.classList.contains('prompt') ){
				latest = modal.getAttribute('data-created')
				closer = modal
			}
		}
		if( closer ){
			return closer.querySelector('.modal-close').click()
		}
		if( 1 ){ // is_esc
			if( document.body.classList.contains('replying')){
				BROKER.publish('REMOVE_CHAT_REPLY')
				return;
			}
		}

		document.body.classList.toggle('menu-hidden')

	}

} // ui close
const debounced_close = make_debounce( ui_close, 150, false )


const back_top = b('div', 'back-top',  'hidden')
back_top.innerText = 'top'
back_top.addEventListener('click', () => {
	window.scroll({
		top: 0,
	})
})
document.body.append( back_top )





















// -- binds

const scroll_handler = () => {
	if( window.pageYOffset > 200 ){
		back_top.classList.remove('hidden')
	}else{
		back_top.classList.add('hidden')
	}
}
// const make_debounce = ( fn, time, immediate, context_args ) => {
const scroll_debounced = make_debounce( scroll_handler, 500, false, {})




// menu toggle
toggle.addEventListener('click', () => {
	document.body.classList.toggle('menu-hidden')
	if( document.body.classList.contains('menu-hidden')){
		localStorage.setItem('pickup-menu-hidden', true )
	}else{
		delete localStorage['pickup-menu-hidden']
	}
})


// init setting / page load
if( window.innerWidth < 800 ){
	document.body.classList.add('menu-hidden')

	document.body.classList.add('is-mobile')

}

if( window.innerWidth > 800 && localStorage.getItem('pickup-menu-hidden') ){
	setTimeout(() => {
		toggle.click()
	}, 100 )
}


// menu click-closes
document.body.addEventListener('click', clickoff_popup )

// esc button closes
document.body.addEventListener('keyup', e => {
	if( e.keyCode === 27 ){
		// debugger
		BROKER.publish('UI_CLOSE', {
			e: e,
			is_esc: true,
		})
	}
})

// all toggles
// for( const toggle of toggles ){
// 	toggle.addEventListener('click', () => {
// 		for( const t of toggles ){
// 			if( t == toggle ) continue
// 			t.parentElement.classList.remove('dropped')
// 		}
// 		toggle.parentElement.classList.toggle('dropped')
// 	})
// }



window.addEventListener('scroll', scroll_debounced )







let env_class
if( env.LOCAL ){
	env_class = 'env-local'
}else if( env.DEV ){
	env_class = 'env-dev'
}else if( env.PRODUCTION ){
	env_class = 'env-production'
}
if( env_class ) document.body.classList.add( env_class )



if( localStorage.getItem('dark-mode') ){
	document.body.classList.add('dark')
}else{

}

dark_mode.addEventListener('click', () => {
	document.body.classList.toggle('dark')
	if( document.body.classList.contains('dark') ){
		localStorage.setItem('dark-mode', Date.now() )
	}else{
		delete localStorage['dark-mode']
	}
})



let title_flashing = false

let og_title = document.title

const set_title = event => {
	const {
		interval,
		msg,
	} = event

	if( interval ){
		if( title_flashing ) clearInterval( title_flashing )
		let toggle = false
		title_flashing = setInterval(() => {
			toggle = !toggle
			if( toggle ){
				document.title = msg
			}else{
				document.title = og_title
			}
		}, interval )
	}else{

		document.title = msg

	}

} // set title


document.addEventListener('visibilitychange', e => {
	if( !document.hidden ){
		document.title = og_title
		clearInterval( title_flashing )
		title_flashing = false
	}
})







// -- subscribers

BROKER.subscribe('UI_CLOSE', debounced_close )
BROKER.subscribe('SITE_TITLE', set_title )

export default {}
