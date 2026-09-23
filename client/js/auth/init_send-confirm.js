import hal from '../hal.js?v=78'
import ui from '../ui.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import Spinner from './Spinner.js?v=78'



const spinner = new Spinner({
	type: 'svg',
})




const content = document.querySelector('#content')

const form = document.createElement("form")
form.id = 'reset'
form.autocomplete = true
content.appendChild( form )

const email = document.createElement('input')
email.type = 'email'
email.name = 'email'
email.classList.add('input')
email.placeholder = 'email'
form.appendChild( email )

const br = document.createElement('br')
form.appendChild( br )

const submit = document.createElement('input')
submit.classList.add('button')
submit.type = 'submit'
submit.value = 'submit'

form.appendChild( submit )

form.onsubmit = e => {

	e.preventDefault()

	spinner.show()

	fetch_wrap('/send_confirm', 'post', {
		email: email.value.trim(),
	})
	.then( res => {
		if( res.success ){
			hal('success', 'success, check your email')
		}else{
			hal('error', res.msg || 'failed to reset', 5000)
		}
		spinner.hide()
	})
	.catch( err => {
		hal('error', 'error', 4000)
		spinner.hide()
	})

}