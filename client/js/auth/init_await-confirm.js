import hal from '../hal.js?v=78'
import ui from '../ui.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import * as lib from '../lib.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'



const content = document.querySelector('#content')


const form = lib.b("form", 'await')
form.classList.add('auth-form')
form.autocomplete = true
content.append( form )

const expl = lib.b('div')
expl.style['text-align'] = 'left'
expl.innerHTML = `
<p class='user-exists'>
	Click the confirmation link in your email, and you're all set.
</p>
<p class='user-exists'>
	Links are valid for ${ GLOBAL.CONFIRM_MINUTES } minutes.
</p>
<br>
<br>
<br>
<p>
	If you need to get a new confirmation link you can do so here.
</p>
`
form.append( expl )

const email = lib.b('input', false, 'input')
email.type = 'email'
email.name = 'email'
email.placeholder = 'email'
// const confirm = lib.b('input')
// confirm.name = 'confirm'
// confirm.type = 'text'
// confirm.classList.add('input')
// confirm.placeholder = 'confirmation code'
form.append( email )
// form.append( confirm )

const br = lib.b('br')
form.append( br )

const submit = lib.b('input')
submit.classList.add('button')
submit.type = 'submit'
submit.value = 'send new link'

form.append( submit )

form.onsubmit = e => {

	e.preventDefault()

	if( !email.value.trim() ) return hal('error', 'no email provided', 5000 )

	fetch_wrap('/send_confirm', 'post', {
		email: email.value.trim(),
	})
	.then( res => {
		if( res.success ){
			hal('success', 'new code has been sent', 10 * 1000)
		}else{
			hal('error', res.msg || 'failed to confirm', 10 * 1000)
		}
	})
	.catch( err => {
		hal('error', err?.msg || 'error', 10 * 1000)
		// ui.spinner.hide()
	})

}


const stored_email = localStorage.getItem('books-email')
if( stored_email ){
	email.value = stored_email
	delete localStorage['books-email']
}


// pre-existing email (deprecated)
if( location.href.match(/\?e=/) ){
	const e = location.href.substr( location.href.indexOf( location.href.match(/\?e=/) ) + 3 )
	email.value = e
}

// user needs to enter email, so hide "has sent" prompt
setTimeout(() => {
	if( location.href.match(/\?new=false/) ){
		for( const p of document.querySelectorAll('.user-exists')) p.remove()
	}	
}, 100 )


