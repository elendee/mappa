import * as lib from './lib.js'
import env from './env.js'






const save_local = e => {
	const input = e.target
	const slug = 'books-restore-' + input.getAttribute('data-modal-type') + '-' + input.getAttribute('data-i')
	localStorage.setItem( slug, input.value )
}
const debounced_local_save = lib.make_debounce( save_local, 300, false )






class Modal {

	constructor( init ){
		// init.id
		init = init || {}
		if( !init.type && env.LOCAL ) debugger

		const ele = this.ele = document.createElement('div')
		this.ele.classList.add('modal')
		if( init.id ) this.ele.id = init.id

		this.ele.setAttribute('data-created', Date.now() )

		const type = this.type = init.type
		this.ele.classList.add( type )
		this.ele.setAttribute('data-type', type )

		this.content = document.createElement('div')
		this.content.classList.add('modal-content')

		// this.liner = document.createElement('div')
		// this.liner.classList.add('modal-liner')
		// this.content.append( this.liner )

		if( init.header ){
			this.header = document.createElement('div')
			this.header.classList.add('modal-header')
			this.header.innerText = init.header
			this.content.append( this.header )
		}

		if( init.use_inner ){
			this.inner_content = document.createElement('div')
			this.inner_content.classList.add('inner-content')
			this.content.append( this.inner_content )
		}

		this.liner = this.inner_content || this.content

		this.close = document.createElement('div')
		this.close.classList.add('modal-close', 'flex-wrapper')
		this.close.innerHTML = '&times;'
		this.close.addEventListener('click', () => {
			this.ele.remove()
			// BROKER.publish('MODAL_CLOSE', { type: init.type })
		})
		this.ele.append( this.content )
		// this.ele.append( this.close )
		this.content.append( this.close )

		if( init.restore ){
			// needs to wait for modal to be initialized...
			setTimeout(() => {
				this.restore_and_bind_inputs( init )
			}, 500)

		}

	}

	restore_and_bind_inputs( init ){

		const inputs = this.get_restore_inputs()

		for( let i = 0; i < inputs.length; i++ ){

			// restore
			const slug = 'books-restore-' + this.type + '-' + i
			const existing = localStorage.getItem( slug )
			if( existing ){
				inputs[i].value = existing
			}

			// set save
			inputs[i].setAttribute('data-i', i )
			inputs[i].setAttribute('data-modal-type', this.type )
			inputs[i].addEventListener('keyup', debounced_local_save )

		}

		if( !init.clear_ele ) return console.error('must provide a clear element to use for restoreable modals')
		init.clear_ele.addEventListener('click', () => {
			this.clear_storage()
		})

	}

	clear_storage(){
		const inputs = this.get_restore_inputs()
		for( let i = 0; i < inputs.length; i++ ){
			// restore
			const slug = 'books-restore-' + this.type + '-' + i
			delete localStorage[ slug ]
		}
	}

	get_restore_inputs(){
		return this.content.querySelectorAll('input, textarea')
	}



	make_columns(){

		this.left_panel = document.createElement('div')
		this.left_panel.classList.add('column', 'column-2', 'left-panel')

		this.right_panel = document.createElement('div')
		this.right_panel.classList.add('column', 'column-2', 'right-panel')

		this.content.append( this.left_panel )
		this.content.append( this.right_panel )

		this.ele.classList.add('has-columns')
		
	}


}




class LightBox extends Modal {
	constructor( init ){
		init = init || {}
		super( init )
		this.src = init.src
		this.ele.classList.add('lightbox')
		if( this.src ){
			this.content.style.background = 'url(' + this.src + ')'
			// if( init.constrain ){
			// 	this.content.style['background-size'] = init.constrain.width + ' ' + init.constrain.height
			// }
			// this.box_main = document.createElement('div')
			// this.box_main.classList.add('lightbox-main')
			// this.main_img = document.createElement('img')
			// this.main_img.src = this.src
			// this.box_main.append( this.main_img )
			// this.content.append( this.box_main )
		}
	}
}





if( env.EXPOSE ) window.Modal = Modal


export {
	Modal,
	LightBox,
}

