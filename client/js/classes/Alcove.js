import env from '../env.js?v=78'
import GLOBAL from '../GLOBAL.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import * as lib from '../lib.js?v=78'
import Model from './Model.js?v=78'
import { Modal } from '../Modal.js?v=78'







const MAP = new Map()




class Alcove extends Model {

	constructor( init, anon_svg ){

		super( init )

		init = init || {}
		// fill
		for( const key in init ){
			this[ key] = init[ key ]
		}

	} // constructor




	hydrate( data ){
		for( const key in data ){
			this[ key ] = data[ key ]
		}
	} // hydrate



	build_edit( args ){
		const {
			show_userlist,
		} = args || {}
		const edit = lib.b('div', false, 'edit-cove', 'button')
		edit.innerHTML = 'edit'
		MAP.set( edit, {
			cove: this,
			show_userlist,
		})
		edit.addEventListener('click', edit_cove )
		return edit

	} // build edit



	_fill_summary( args ){
		const {
			wrap,
			is_owner,
		} = args

		if( is_owner ){
			wrap.classList.add('is-owner')
			wrap.title = 'You are the owner'
			const _own = lib.b('div', false, 'cove-king')
			_own.innerHTML = '♕'
			wrap.append( _own )
		}

		const name = lib.b('div', false, 'cove-name')
		name.innerText = this.name
		wrap.append( name )

		if( this.is_dm ){

			// overwrite DM name as p2 only:
			let register
			try{
				register = JSON.parse( this.name_register )
				let p1, p2
				for( const uuid in register ){
					if( uuid == USER.uuid ){
						p1 = register[uuid]
					}else{
						p2 = register[uuid]
					}
				}
				if( !p1 ) throw new Error('p1 not in name register', this )
				if( !p2 ){
					console.warn('invalid name register', this )
					name.innerText = '(anon)'
				}else{
					name.innerText = p2
				}
			}catch( err ){
				if( env.LOCAL ) console.error('no name register', err )
			}

			// render the DM
			wrap.classList.add('is-dm')
			wrap.title = 'Dialogue'
			const speech = lib.b('span', false, 'speech')
			speech.innerHTML = `🗪`
			wrap.prepend( speech )
		}

	} // fill summary

	_output_grid( args ){
		const {
			// wrap,
			as_link,
		} = args

		const type_class = 'model-type-' + this.constructor.name.toLowerCase()

		let wrap = lib.b('div', false, 'model-grid', type_class )
		if( as_link ){
			wrap = lib.b('a', false, 'model-grid', type_class )
			wrap.href = `/alcove/${this.uuid}`
		}

		const name = lib.b('div', false, 'cove-name')
		name.innerText = this.name
		wrap.append( name )

		return wrap

	} // output grid

	_output_listing( args ){
		const {
			wrap,
			include_link,
			include_desc,
			is_user,
			as_link,
			custom_link,
		} = args

		if( as_link ) wrap.href = `/${this.gen_href()}`
		if( custom_link ) wrap.href = custom_link

		const name = lib.b('div', false, 'cove-name')
		name.innerText = this.title || this.name || '-'
		wrap.append( name )

		if( include_link ){
			const link = lib.b('a', false, 'button')
			link.href = `/${this.route || this.constructor.name.toLowerCase()}/${this.uuid}`
			link.innerText = `go to ${this.constructor.name}`
			wrap.append( link )
		}

		if( include_desc ){
			const desc = lib.b('div', false, 'cove-desc')
			desc.innerText = lib.abbreviate( this.description || 'no description', 50, 'char' )
			wrap.append( desc )
		}

		return wrap

		return wrap

	} // output listing



	_custom_post_form( args ){
		const {
			form,
			edit_args,
		} = args || {}

		const is_viz = form.querySelector('.model-detail-is_visible label')
		const is_private = form.querySelector('.model-detail-is_private label')

		const help = lib.build_help({
			Modal,
			// header: 'Alcoves',
			expl: `
Private Alcoves require permission from the owner to join.`,
		})
		is_private.append( help )

		const help2 = lib.build_help({
			Modal,
			// header: 'Alcoves',
			expl: `
Visible Alcoves can be seen in the public directory.  
				
When invisible in the directory, they may still be accessed by anyone who has the unique URL.`,
		})
		is_viz.append( help2 )

		const rm = lib.b('div', false, 'button', 'rm')
		rm.innerText= 'delete'
		rm.addEventListener('click', remove_alcove )
		form.append( rm )

	} // custom post form



} // Alcove













const edit_cove = e => {
	const btn = lib.click_parent( e.target, 'edit-cove', false, 5 )
	const {
		show_userlist,
		cove,
	} = MAP.get( btn )

	const modal = new Modal({
		type: 'edit-cove-pop',
	})

	modal.make_columns()

	const form = cove.build_edit_form({
		force_type: 'Alcove',
		force_edit_label: 'Alcove'
	})
	modal.left_panel.append( form )

	document.body.append( modal.ele )

} // edit cove






const remove_alcove = e => {
	const btn = lib.click_parent( e.target, 'button', false, 5 )
	// const uuid = 
	const form = lib.click_parent( btn, 'model-form', false, 5 )

	const uuid = form.getAttribute('data-uuid')

	fetch_wrap('/')

}





export default Alcove