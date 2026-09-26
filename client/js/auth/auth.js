import * as lib from '../lib.js'
import { Modal } from '../Modal.js'
import fetch_wrap from '../fetch_wrap.js'
import hal from '../hal.js'


// decl

const params = new URLSearchParams( location.search )

const openLogin = () => {

	const modal = new Modal({
		type: 'login',
		header: 'login',
	})

	const email = lib.b('input', false, 'input')
	email.placeholder = 'email'
	email.name = 'email'
	modal.content.append( email )

	const pw = lib.b('input', false, 'input')
	pw.placeholder = 'password'
	pw.name = 'password'
	pw.type = 'password'
	pw.addEventListener('keyup', e => {
		if( e.keyCode == 13 ){
			submit.click()
		}
	})
	modal.content.append( pw )

	const submit = lib.b('button', false, 'button')
	submit.innerText = 'sign in'
	submit.addEventListener('click', e => {
		fetch_wrap('/login', 'post', {
			email: email.value.trim(),
			password: pw.value.trim(),
		})
		.then( res => {
			if( !res?.success ) return hal('error', res?.msg || 'error signing in', 5000 )
			hal('success', 'success', 1000 )
			setTimeout(() => location.reload(), 500 )
		})
	})
	modal.content.append( submit )

	const forgot = lib.b('div', false, 'button', 'forgot')
	forgot.innerText = 'send login link'
	forgot.addEventListener('click', e => {
		if( !email.value.trim()) return hal('error', 'must provide an email', 5000 )
		if( !confirm('Send login link to ' + email.value + '?')) return;
		fetch_wrap('/send_confirm', 'post', {
			email: email.value.trim(),
		})
		.then( res => {
			if( !res?.success ) return hal('error', res?.msg || 'error sending', 5000 )
			hal('success', 'link sent; check email', 10 * 1000 )
		})
	})
	modal.content.append( lib.b('br') )
	modal.content.append( lib.b('br') )
	modal.content.append( forgot )

	const swap = lib.b('div', false, 'swap')
	swap.innerText = 'click here to register'
	swap.addEventListener('click', () => {
		modal.close.click()
		openRegister()
	})
	modal.content.append( swap )

	document.body.append( modal.ele )
	setTimeout(() => email.focus(), 50 )

}



const openRegister = () => {
	const modal = new Modal({
		type: 'register',
		header: 'register',
	})

	const expl = lib.b('div')
	expl.innerText = `You will get an automatic login link in your email.`

	modal.content.append( expl )

	modal.content.append( lib.b('br') )
	modal.content.append( lib.b('br') )

	const email = lib.b('input', false, 'input')
	email.placeholder = 'email'
	email.name = 'email'
	email.addEventListener('keyup', e => {
		if( e.keyCode === 13 ){
			submit.click()
		}
	})
	modal.content.append( email )

	const submit = lib.b('button', false, 'button')
	submit.innerText = 'register'
	submit.addEventListener('click', e => {
		fetch_wrap('/register', 'post', {
			email: email.value.trim(),
		})
		.then( res => {
			if( !res?.success ) return hal('error', res?.msg || 'error registering', 5000 )
			hal('success', 'registered — check your email', 3000 )
			setTimeout(() => location.reload(), 500 )
		})
	})
	modal.content.append( submit )

	const swap = lib.b('div', false, 'swap')
	swap.innerText = 'click here to login'
	swap.addEventListener('click', () => {
		modal.close.click()
		openLogin()
	})
	modal.content.append( swap )

	document.body.append( modal.ele )
	setTimeout(() => email.focus(), 50 )

}


// bind — all matching triggers (nav + layer prompt etc.)

for( const el of document.querySelectorAll('.menu-item.login') ){
	el.addEventListener('click', e => {
		e.preventDefault()
		openLogin()
	})
}

for( const el of document.querySelectorAll('.menu-item.register') ){
	el.addEventListener('click', e => {
		e.preventDefault()
		openRegister()
	})
}


// init

if( params.get('prompt_login') ){
	openLogin()
}



export default {
	openLogin,
	openRegister,
}
