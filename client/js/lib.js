import env from './env.js?v=78'
import hal from './hal.js?v=78'
import BROKER from './EventBroker.js?v=78'
import GLOBAL from './GLOBAL.js?v=78'







if( !GLOBAL.SKIP.THIRD_PARTY_SCRIPTS ){
	import('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/es/highlight.min.js')
	.then( module => {
		window.hljs = module.default
	})
	.catch( err => {
		if( env.LOCAL ){
			console.warn('no-load hljs')
		}else{
			console.log( err )
		}
	})
}








const header_ele = document.getElementById('header') || document.getElementById('layer-panel')
const is_logged = header_ele && header_ele.getAttribute('data-auth') === 'true'
const is_admin = header_ele && header_ele.getAttribute('data-admin') === 'true'





const second = 1000
const minute = second * 60
const hour = minute * 60
const day = hour * 24
const week = day * 7
const year = week * 52

const times = {
	second,
	minute,
	hour,
	day,
	week,
	year,
}




const is_num = value => {
	const coercedValue = Number(value);
	return typeof coercedValue === 'number' && !isNaN(coercedValue) && !isNaN(parseFloat(value));
};





const click_parent = ( start_ele, target_class, target_id, depth ) => {
	if( target_class && start_ele.classList.contains( target_class )){
		return start_ele
	}else if( target_id && start_ele.id === target_id ){
		return start_ele
	}
	let condition
	for( let i = 0; i< depth; i++ ){
		if( !start_ele.parentElement ) return //console.log('click parent found no parent matching: ', target_class, target_id )
		condition = false
		if( target_class ){
			condition = start_ele.parentElement?.classList.contains( target_class )
		}else if( target_id ){
			condition = start_ele.parentElement?.id === target_id
		}
		if( condition ){
			return start_ele.parentElement
		}else{
			start_ele = start_ele.parentElement
		}
	}
}



function capitalize( word ){

	if( typeof( word ) !== 'string' ) return false

	let v = word.substr( 1 )

	word = word[0].toUpperCase() + v

	return word

}



function random_hex( len ){

	//	let r = '#' + Math.floor( Math.random() * 16777215 ).toString(16)
	let s = ''
	
	for( let i = 0; i < len; i++){
		s += Math.floor( Math.random() * 16 ).toString( 16 )
	}
	
	return s

}


function is_valid_uuid( data ){

	if( typeof( data === 'string' ) && data.length > 10 ) return true
	return false

}



function scry( x, old_min, old_max, new_min, new_max ){

	const first_ratio = ( x - old_min ) / ( old_max - old_min )
	const result = ( first_ratio * ( new_max - new_min ) ) + new_min
	return result
}







function validate_number( ...vals ){

	for( const num of vals ){
		if( typeof num === 'number' || ( num && typeof Number( num ) === 'number' ) ) return Number( num )
	}
	return vals[ vals.length - 1 ]

}



const random_range = ( low, high, int ) => {

	if( low >= high ) return low

	return int ? Math.floor( low + ( Math.random() * ( high - low ) ) ) : low + ( Math.random() * ( high - low ) )

}

const random_entry = source => {

	if( Array.isArray( source )){
		return source[ random_range( 0, source.length - 1, true ) ]
	}else if( source && typeof source === 'object'){
		return source[ random_entry( Object.keys( source ) ) ]
	}
	return ''
}











const to_alphanum = ( value, loose ) => {
	if( typeof value !== 'string' ) return false
	if( loose ){
		return value.replace(/([^a-zA-Z0-9 _-|.|\n|!])/g, '')
	}else{
		return value.replace(/([^a-zA-Z0-9 _-])/g, '')
	}
}




const serialize  = form => { // = window.pal_serialize
	return new URLSearchParams( new FormData( form ) ).toString()
}


const is_valid_email = email => {
	return typeof email === 'string' && email.match(/.*@..*\..*/)
}





const trimStrict = string => {
    // Remove leading spaces
    while(string.indexOf(' ') === 0) {
        string = string.substr(1);
    }
    // Remove trailing spaces
    while(string[string.length-1] === ' ') {
        string = string.substr(0, string.length-1);
    }
    return string;
}




const get_index = ( nodeList, ele ) => {
	for( let i = 0; i < nodeList.length; i++ ){
		if( nodeList[i] === ele ) return i
	}
}

const shift_element = window.shift_element = ( dir, ele, identifier, cycle ) => {
	/*
		***
		'dir' refers to -index order-, not screen space or DOM order
		***
	*/
	if( !ele ){
		console.log('missing ele for shift')
		return
	}
	const siblings = ele.parentElement.querySelectorAll( identifier )
	if( !siblings?.length ){
		console.log('no siblings for shift')
		return
	}

	const index = get_index( siblings, ele )
	if( typeof index !== 'number' ){
		console.log('invalid move', ele, index)
		return
	}
	let prev_sib = siblings[ index - 1 ]
	let next_sib = siblings[ index + 2 ]

	console.log( 'shift index :', dir, !!prev_sib )

	switch( dir ){

		case 'up':
			/*
				[parent] insertBefore [insertion node] [reference node]
			*/
			if( !next_sib ){
				if( siblings[ index + 1 ]){
					ele.parentElement.appendChild( ele )
					return
				}else if( cycle ){
					ele.parentElement.insertBefore( ele, siblings[0] )
					return
				}
			}
			ele.parentElement.insertBefore( ele, next_sib )
			break;

		case 'down':
			if( !prev_sib ){
				if( !cycle ){ // because null child ref will still work otherwise
					console.log('no prev sib for shift')
					return
				}else{
					/*
						this assumes that there is no other content in parentElement
						in some cases this could be bad
					*/
					ele.parentElement.appendChild( ele )
					return
				}
			}
			ele.parentElement.insertBefore( ele, prev_sib )
			break;

		default: 
			console.log('invalid shift dir', dir )
			break;

	}

}





const is_hex_color = color => {
	return ( typeof color === 'string' && !color.match(/[g-z]/i) && color.length >= 6 && color.length <= 9 )
}

const char_map = {
	a: 10,
	b: 11,
	c: 12,
	d: 13,
	e: 14,
	f: 15,
}

function convertToHex(value) {

	if (value.startsWith('rgb') ){
		// If value is RGB, extract the red, green, and blue values
		const rgbValues = value.match(/\d+/g);
		const red = parseInt(rgbValues[0]);
		const green = parseInt(rgbValues[1]);
		const blue = parseInt(rgbValues[2]);

		// Convert the RGB values to hex and concatenate them
		const hexValue = '#' + ((red << 16) | (green << 8) | blue).toString(16).padStart(6, '0');
		return hexValue;
	} else if (value.startsWith('#')) {
		// If value is already a hex value, return it
		return value;
	} else {
		// Otherwise, assume it's an invalid input
		// throw new Error('Invalid input');
		console.error('invalid color convert: ' + value )
	}

}

const offset_color = ( color, contrast_bool, add_alpha ) => {
	
	color = convertToHex( color || '#000000' )

	if( !is_hex_color( color ) ){
		console.log('invalid hex color: ', color )
		return contrast_bool ? '#000000' : '#222222'
	}

	let c = color.replace('#', '').substr(0,6)

	// console.log('testing bg color: ', color, c )

	let num
	const rgb = {r: 0, g: 0, b: 0}
	for( let i = 0; i < c.length; i++ ){

		const n = Number( c[i] )

		if( typeof n === 'number' && !isNaN( n ) ){
			num = n
		}else if( char_map[ c[i] ]){
			num = char_map[ c[i] ]
		}else{
			num = 0
			// console.log('invalid num', n )
		}

		// console.log(`adding index ${ i } color: ${ num }`)

		if( i < 2 ){ // red
			rgb.r += ( i === 0 ) ? num * 16 : num
		}else if( i < 4 ){ // green
			rgb.g += ( i === 2 ) ? num * 16 : num
		}else{ // blue
			rgb.b += ( i === 4 ) ? num * 16 : num
		}

	}

	// console.log(`rgb res:`, rgb )

	// https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
	const computed = ( rgb.r * .299 ) + ( rgb.g * .587 ) + ( rgb.b * .114 )

	let val

	if( computed > 150 ){ // 186 standard
		val = contrast_bool ? '#000000' : '#222222'
	}else{
		val = contrast_bool ? '#ffffff' : '#dddddd'
	}

	if( add_alpha ){
		val += add_alpha
	}

	return val

}



const b = ( type, id, ...classes ) => {
	const ele = document.createElement( type )
	if( id ) ele.id = id
	for( const c of classes ){
		ele.classList.add( c )
	}
	return ele
}


const b_label = ( text ) => {
	const label =b('label')
	label.innerText = text
	return label
}






const make_debounce = ( fn, time, immediate, context_args ) => {
    let buffer
    return ( args ) => {
        if( !buffer && immediate ) fn( args, context_args )
        if( context_args?.exec_steady ){
        	if( buffer ) return;
	        buffer = setTimeout(() => {
	            fn( args, context_args )
	            buffer = false
	        }, time )
        }else{
	        clearTimeout( buffer )
	        buffer = setTimeout(() => {
	            fn( args, context_args )
	            buffer = false
	        }, time )
        }
    }
}






const ALL_DROPS = {}
const clear_drops = ( e, force ) => {
	// check if click was on drop
	// let c = 0
	// let ele = e.target
	// while( c < 5 ){
	// 	if( ele?.classList?.contains('drop-scroller') || !ele.parentElement ){
	// 		c = 5
	// 		return console.log('clicked drop')
	// 	}
	// 	ele = ele.parentElement
	// 	c++
	// }
	if( !force ){
		if( click_parent( e.target, 'drop-scroller', false, 10 )) return console.log('clicked drop')
	}

	for( const drop of document.body.querySelectorAll('.drop-scroller') ){
		const d = ALL_DROPS[ drop.getAttribute('data-uuid') ]
		if( !d ){
			console.error('drop is in DOM but not mem', drop)
			// continue
		}
		d.remove( false, false, 'clear all' )
	}
}


class DropOptions {
	/*
		take [options] as input
		call with every new result set; not meant for re-use
		simply shows it; no callbacks assigned
	*/

	constructor( init ){

		init = init || {}

		this.uuid = random_hex(6)
		ALL_DROPS[ this.uuid ] = this

		// required:
		this.input = init.input
		this.options = init.options
		this.search_type = init.search_type || 'string_match'
		// this.source_input = init.source_input

		// elements:
		this.scroller = b('div', false, 'drop-scroller')
		this.scroller.setAttribute('data-uuid', this.uuid )
		this.interior = b('div', false, 'drop-interior')
		for( const opt of this.options ){
			const o = b('div', false, 'drop-option')
			o.innerText = opt.text
			o.setAttribute('data-value', opt.value )
			this.interior.append( o )
		}
		if( !this.options?.length ){
			const o = b('div', false, 'drop-option')
			o.innerHTML = '(no results)'
			this.interior.append( o )
		}
		this.scroller.append( this.interior )

		/*
			provide 'clear_'s to enforce valid entries
			- the presence of the attr on the source = valid
			- if !valid, source will be cleared
		*/
		this.clear_source = init.clear_source
		this.clear_attr = init.clear_attr || 'data-source'
		if( !this.clear_source ){
			console.error('must provide source for clear attr in Drop-Option')
		}

		this.input.classList.add('has-drop')

		// instantiated
		this._adjusting = false

		this.init()
	
	}

	init(){

		this.scroller.addEventListener('click', e => {

			switch( this.search_type ){

			case 'string_match':

				// weird click invalidate (on scroller but not option)
				if( !e.target.classList.contains('drop-option') ){
					this.remove( false, false, 'click off')
					return console.log('invalid click')
				}
				// no results click
				const matcher = e.target.innerText.trim()
				const value = e.target.getAttribute('data-value')
				if( matcher.match(/no results/i) ){
					return this.remove( false, true, 'no-results click' )
				}
				// valid click
				// - actual value
				this.input.setAttribute( this.clear_attr, value )
				// - visible value
				this.input.value = matcher
				this.remove( true, false, 'is valid' )
				break;

			default:
				console.error('drop options missing search type')
				break;

			}

		})

	}

	set_pos( target ){
		const bounds = target.getBoundingClientRect()
		this.scroller.style.top = ( bounds.top + bounds.height ) +  'px'
		this.scroller.style.left = bounds.left + 'px'
		this.scroller.style.width = bounds.width + 'px'		
	}

	show( target ){
		target = target || this.input
		// blank slate
		for( const uuid in ALL_DROPS ){
			ALL_DROPS[ uuid ].remove( false, true, 'show clear' )
		}
		// then show this one
		ALL_DROPS[ this.uuid ] = this
		this.set_pos( target )
		this._adjusting = setInterval(() => {
			this.set_pos( target )
		}, 100 )

		document.body.append( this.scroller )
		document.body.addEventListener('click', clear_drops )

	}

	remove( is_valid, still_typing, caller ){
		// remove dropdown
		this.scroller.remove()
		clearInterval( this._adjusting )
		delete ALL_DROPS[ this.uuid ]
		// optionally clear source
		if( this.clear_source ){
			if( is_valid || still_typing ){
				// valid
				console.log('Drop-Option: ', is_valid ? 'valid' : '', still_typing ? 'still typing' : '', caller )
			}else{
				// invalid
				this.clear_source.removeAttribute( this.clear_attr )
				this.clear_source.value = ''
				console.log('Drop-Option: ', 'remove')
			}
		}else{
			console.log('Drop-Option: ', 'vanilla')
		}
		document.body.removeEventListener('click', clear_drops )
	}

}





const show_limit_count = ( wc, element, data ) => {

	const {
		max,
		type,
		min,
		cling,
		offsetY,
	} = data

	// check too many
	let count
	switch( type ){
	case 'word':
		if( element.value ){
			count = element.value.trim().split(' ').length
		}else{
			count = 0
		}
		break;
	case 'char':
		count = element?.value ? element.value.length : 0
		break;
	default: 
		return console.error('invalid limit type: ', data )
	}

	const remaining = max - count 
	// wc.innerText = remaining + ' words remaining'
	wc.innerText = `${ remaining } ${ type }s remaining`
	if( remaining < 0 ){
		wc.classList.add('overboard')
	}else{
		wc.classList.remove('overboard')
		// check not enough
		if( min ){
			const missing = count - min
			if( missing < 0 ){
				wc.classList.add('overboard') // (actually 'underboard', just red)
				wc.innerText = `${ min } ${ type }s required` //  (missing ${ -missing })
			}else{
				wc.classList.remove('overboard')
			}	
		}
	}

	if( cling ){
		const bounds = element.getBoundingClientRect()
		wc.style.bottom = ( window.innerHeight - ( bounds.top + bounds.height ) - offsetY ) + 'px'
		wc.style.right = ( window.innerWidth - ( bounds.left + bounds.width ) ) + 'px'
	}

}

const count_element_words = element => {
	return ( element.value.trim().split(' ')[0] ? element.value.trim().split(' ').length : 0 )
}


const add_length_count = window.awc = ( wrapper, element, data ) => {

	const {
		type,
		cling,
		max,
		min,
		offsetY
	} = data
	if( typeof data !== 'object') return console.log('add_length_count takes object limit')
	if( typeof type !== 'string' ) return console.error('invalid length count type')
	if( typeof cling !== 'boolean' ) return console.error('invalid length count cling')
	if( typeof max !== 'number' ) return console.error('invalid length count max')
	if( typeof min !== 'number' ) return console.error('invalid length count min')
	if( typeof offsetY !== 'number' ) return console.error('invalid length count offsetY')

	if( element.type !== 'text' && !element.nodeName.match(/textarea/i) ){
		return console.log('invalid word_count node: ', element )
	}

	if( !element.setAttribute ){
		console.log( 'skipping word count here', element )
	}else{
		element.setAttribute('data-word-limit', max )
	}

	const wc = document.createElement('div')
	wc.classList.add('word-count')
	if( cling ){
		wc.classList.add('clingy')
	}

	wrapper.appendChild( wc )

	let listening

	element.addEventListener('focus', e => {
		if( data ){
			console.log( data )
			show_limit_count( wc, element, data, false )
		}else{
			switch( type ){
			case 'word':
				wc.innerText = count_element_words( element ) + ' words'
				break;
			case 'char':
				wc.innerText = `${ element?.value?.length || 0 } chars`
				break;
			default: 
				return console.error('invalid limit type', data )
			}
		}
		wc.classList.remove('hidden')
	})

	element.addEventListener('blur', e => {
		wc.innerText = ''
		wc.classList.add('hidden')
	})

	element.addEventListener('keyup', e => {
		if( !listening ){
			listening = setTimeout(() => {
				// console.log( limit, element.value )
				if( data?.block_empty && !element.value ){
					wc.innerText = 'element cannot be empty'
					wc.classList.add('overboard')
				}else if( data ){
					show_limit_count( wc, element, data, false )
				}else{
					switch( type ){
					case 'word':
						wc.innerText = count_element_words( element ) + ' words'
						break;
					case 'char':
						wc.innerText = `${ element?.value?.length || 0 } chars`
						break;
					default: 
						return console.error('invalid limit type', data )
					}
				}
				clearTimeout( listening )
				listening = false
			}, 300 )
		}
	})
}









const sleep = async( ms ) => {
	await new Promise( resolve => setTimeout( resolve, ms ) )
}



const abbreviate = ( string, len, abbrev_type ) => {

	if( typeof string !== 'string' ) return ''

	switch( abbrev_type ){
	case 'word':
		let words = string.split(' ')
		if( words.length > len ) return words.splice(0, len).join(' ') + '...'
		return string

	case 'char':
		if( string.length > len ) return string.substr(0, len ) + '...'
		return string

	default:
		console.log('unknown abbrev type', abbrev_type )
		return ''
	}
}





class Folder {
	constructor( init ){
		init = init || {}
		/*
			{
				sections: {
					type: {
						label_text,
					}
				}
			}
		*/
		if( !init.sections ) return console.error('must provide folder sections')
		// this.sections = init.sections
		this.ele = b('div', false, 'folder' )
		this.tab_wrapper = b('div', false, 'folder-tabs')
		this.tabs = {}
		this.sections = {}
		this.contents = b('div', false, 'folder-contents')
		this.ele.append( this.tab_wrapper )
		this.ele.append( this.contents )

		for( const type in init.sections ){
			const data = init.sections[type]
			let tab
			this.tabs[ type ] = tab = b('div', false, 'folder-tab' )
			tab.innerText = data.label_text || type.replace(/_/g, ' ')
			if( data.capitalize ){
				tab.innerText = capitalize( tab.innerText )
			}
			tab.addEventListener('click', set_active_tab )
			tab.setAttribute('data-type', type )
			this.tab_wrapper.append( tab )
			this.sections[ type ] = b('div', false, 'folder-section')
			this.sections[ type ].setAttribute('data-type', type )
			this.contents.append( this.sections[ type ] )
		}

	}
}

const set_active_tab = e => {
	const tab = e.target
	const type = tab.getAttribute('data-type')
	const wrap = tab.parentElement
	const folder = wrap.parentElement
	const tabs = wrap.querySelectorAll('.folder-tab')
	for( const t of tabs ){
		if( t === tab ){
			t.classList.add('active')
			continue
		}
		t.classList.remove('active')
	}
	const sections = folder.querySelectorAll('.folder-section')
	let active_section
	for( const section of sections ){
		section.classList.remove('active')
		if( section.getAttribute('data-type') === type ){
			section.classList.add('active')
			active_section = section
		}
	}
	BROKER.publish('FOLDER_SET_ACTIVE', {
		type,
		folder,
		active_section,
	})
}


const select_contents = node => {
    const range = document.createRange();
    range.selectNode( node );
    window.getSelection().removeAllRanges();
    window.getSelection().addRange( range );
}


const copyToClipboard = ( copy_node, msg_target_ele ) => {

    const range = document.createRange();
    range.selectNode( copy_node );
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    
    try {
        const successful = document.execCommand('copy');
        if( successful ){
        	hal('success', 'copied', 1000, {
        		msg_target_ele,
        		float_dist: 80,
        	})
        }else{
			hal('standard', 'failed to copy', 1000 )
        }

    } catch (err) {
        console.error('Failed to copy content: ', err);
		hal('error', 'failed to copy', 2000 )
    }
    
    window.getSelection().removeAllRanges();

}





const handle_markdown = ( data, caller ) => {
	if( !window.marked ){
		console.error('skipping DOMPurify', caller )
		return data
	}
	try{
		if( typeof data !== 'string' ) return;
		// return DOMPurify.sanitize( data )
		return DOMPurify.sanitize( marked.parse( data ) )
	}catch( err ){
		console.error('marked/ parsed is not defined')
		return undefined;
	}
}






const copy_content = e => {
	const btn = e.target
	const pre = btn.parentElement
	const code = pre.querySelector('code')
	if( code ){
		copyToClipboard( code, btn )
	}

}

const select_content = e => {
	const btn = e.target
	const pre = btn.parentElement
	const code = pre.querySelector('code')
	select_contents( code )
}



const add_select_code = node => {

	const parent = node.parentElement
	const btn = b('button', false, 'button', 'select')
	btn.innerText = 'select'
	btn.addEventListener('click', select_content )

	parent.append( btn )

}


const add_copy_code = node => {

	const parent = node.parentElement
	const btn = b('button', false, 'button', 'copy')
	btn.innerText = 'copy'
	btn.addEventListener('click', copy_content )

	parent.append( btn )

}


const add_option = code_block => {

	const pre = code_block.parentElement
	const drop = b('select', false, 'code-theme-choice', 'input')
	pre.append( drop )
	const blank = b('option')
	blank.value = ''
	blank.innerText = 'none'
	blank.selected = true
	drop.append( blank )
	for( const theme of themes ){
		const opt = b('option')
		opt.value = theme
		opt.innerText = theme.replace(/-/g, ' ').replace(/\./g, ' ')
		drop.append( opt )
	}

	let mode
	if( document.body.classList.contains('dark')){
		mode = 'dark'
	}else{
		mode = 'light'
	}
	const extant = localStorage.getItem('worldsim-code-theme-' + mode )
	if( extant ){
		drop.value = extant
	}

	drop.addEventListener('change', e => {
		set_theme_for_mode( drop.value )
	})

}














const charcode = ( num, shift, upper ) => {
	let val = String.fromCharCode( num + ( shift ? 65 : 0 ) )
	if( !upper ) val = val.toLowerCase()
	return val
}









const auto_date = ( value, trim_seconds ) => {
	const is_recent = Date.now() - value < day
    let part = is_recent ? 1 : 0
    let val = new Date( value ).toLocaleString().split(',')[ part ]
    if( trim_seconds && is_recent ){
    	const sections = val.split(':')
    	val = sections[0] + ':' + sections[1] + sections[2].substr(2)
    }
    return val
}

const build_help = args => {
	const {
		Modal,
		expl,
		html,
		header,
		btn_text,
	} = args

	const help = b('div', false, 'button', 'help')
	help.innerText = btn_text || '?'
	help.addEventListener('click', () => {
		const modal = new Modal({
			type: 'explain',
			header,
		})
		const expl_ele = b('div', false, 'expl')
		if( html ){
			expl_ele.innerHTML = html
		}else{
			expl_ele.innerText = expl
		}

		modal.content.append( expl_ele )
		document.body.append( modal.ele )
	})
	return help
}



const get_funder_name = ( entity, print_no_name ) => {
	const {
		name,
		surname,
	} = entity || {}

	const _name = name || ''
	const _surname = surname || ''

	return ( name + ( name ? ' ' : '' ) + surname ) || ( print_no_name ? '(no name)' : '' )

}


const get_username = user => {
	return user.handle || 'anon user'
}

const money = ( number, style, currency, lang ) => {
	if( typeof number !== 'number'){
		console.warn('invalid money val: ', number )
		number = 0
	}
	return number.toLocaleString( lang || 'en-US', {
		style: style || 'currency',
		currency: currency || 'USD',
	})
}


const hundred = 100
const thousand = 1000
const million = 10 * hundred * thousand
const billion = million * 1000
const trillion = billion * 1000

const amounts = {
	hundred,
	thousand,
	million,
	billion,
	trillion,
}

const disable = ( ele, undo_ms ) => {
	ele.classList.add('disabled')
	setTimeout(() => {
		ele.classList.remove('disabled')
	}, undo_ms || 500 )
}

const animate = args => {
	const {
		ele,
		type,
		ms,
	} = args

	switch( type ){
	case 'fade':
		ele.style.transition = ( ms / 1000 ) + 's'
		setTimeout(() => {
			ele.style.opacity= 0
		}, 10 )
		setTimeout(() => {
			ele.style.opacity= 1
		}, ms )
		break;
	// case 'flicker':
	// 	break;
	case 'fade_in':
	case 'fade_out':
	default:
		return console.error("unknown anim", type )
	}

}


const get_subdir = args => {
	const {
		stamp,
		slug,
	} = args 

	let _stamp = stamp
	if( !_stamp ){
		if( typeof slug !== 'string' ) return 'invalid'
		_stamp = Number( slug.split('_')[0] )
	}

	if( !is_num( _stamp ) ) return 'invalid'
	if( String( _stamp ).length !== 13 ) return 'invalid'

	const date = new Date( Number( _stamp ) )
	const year = date.getYear() - 100
	const month = date.getMonth()

	return year + '/' + month
}


const sanitize_and_format_price = ( value ) => {
	/*
		convert the "cents" number input to a display-able text dollar value
	*/

    // Remove non-numeric characters and keep the decimal point
    value = value.replace(/[^0-9.]/g, '');

    // Coerce the value into a valid USD format
    if( value === '.' || value === '' ){
        value = '0.00';
    }else{
    	const _str = value.toString()
    	const diff = 3 - _str.length
    	if( diff > 0 ){
    		value = '0'.repeat(diff) + value
    	}
    }

    value = cents_to_currency( value )

    return value
}


const build_price = ( value ) => {

	const wrap = b('div', false, 'price-wrap')

	const input = b('input', false, 'input', 'price-input')
	input.type = 'number'

	const display = b('div', false, 'price-display')
	display.innerText = ''

	input._display = display

	input.addEventListener('keyup', update_price_display )
	input.addEventListener('change', update_price_display )
	input.addEventListener('blur', update_price_display )
	input.addEventListener('focus', update_price_display )

	wrap.append( display )
	wrap.append( input )

	return wrap

}

const update_price_display = e => {
	
	const input = e.target
	// if( input.)

	const display = input._display
	display.innerText = sanitize_and_format_price( input.value )

}


const cents_to_currency = cents => {  

	const formattedAmount = new Intl.NumberFormat('en-US', { 
		style: 'currency', 
		currency: 'USD' 
	}).format( cents / 100 );

	return formattedAmount
}



let calls = 0
let clearing_toggles

const base_toggle_action = ( e, args ) => {
	const {
		state,
		wrap,
		programmatic,
		caller,
	} = args || {}

	// sanity check for infinite loops
	calls++
	if( calls > 50 ) return console.error('too rapid toggle-callbacks', `caller: ${caller}`)
	if( !clearing_toggles ){
		clearing_toggles = setTimeout(() => {
			calls = 0
			clearing_toggles = false
		}, 3000 )
	}

	const _wrap = wrap || click_parent( e.target, 'toggle-wrap', false, 5 )

	const {
		validate,
		callback,
		val1,
		val2,
	} = TOGGLE_MAP.get( _wrap )

	if( !programmatic ){
		const err = validate()
		if( err ){
			if( typeof err === 'string' ) hal('error', err, 5000 )
			return console.warn( err );
		}
	}

	if( typeof state === 'boolean' || typeof state === 'number' ){
		if( state ){
			_wrap.classList.add('toggled')
		}else{
			_wrap.classList.remove('toggled')
		}
	}else if( e ){
		_wrap.classList.toggle('toggled')
	}

	render_toggle_state( _wrap )

	if( callback && !programmatic ) callback( e, args )

} // 

const render_toggle_state = window.render_toggle_state = ( wrap ) => {

	const nob = wrap.querySelector('.toggle-nob')
	const value1 = wrap.getAttribute('data-value-1')
	const value2 = wrap.getAttribute('data-value-2')
	if( !wrap.classList.contains('toggled') ){
		nob.style.left = '4px'
		wrap.setAttribute('data-current-val', value1 )
	}else{	
		const bounds_slider = wrap.getBoundingClientRect()
		const bounds_nob = nob.getBoundingClientRect()
		nob.style.left = ( bounds_slider.width - bounds_nob.width - 4 ) + 'px'
		wrap.setAttribute('data-current-val', value2 )
	}
}


const TOGGLE_MAP = new Map()

const build_toggle = args => {
	const {
		key,
		val1,
		label1,
		val2,
		label2,
		callback,
		validate,
		embed_text,
		label_text,
	} = args

	const wrap = b('div', false, 'toggle-wrap')
	wrap.setAttribute('data-value-1', val1 || 'off' )
	wrap.setAttribute('data-value-2', val2 || 'on' )
	if( key ){
		wrap.setAttribute('data-key', key )
	}
	if( embed_text ) wrap.classList.add('embedded')
	// here the DOM element toggles
	wrap.addEventListener('click', base_toggle_action )

	TOGGLE_MAP.set( wrap, {
		validate,
		callback,
		val1,
		val2,
	})
	wrap.setAttribute('data-current-val', val1 )

	let _label
	if( label_text ){
		_label = b('div', false, 'label')
		_label.innerHTML = label_text
	}

	const track = b('div', false, 'toggle-track')	
	const nob = b('div', false, 'toggle-nob')
	nob.style.left = '4px'
	track.append( nob )
	wrap.append( track )

	let set_bounds
	if( embed_text ){

		set_bounds = () => {
			const bounds = wrap.getBoundingClientRect()
			nob.style.width = ( bounds.width / 2 ) + 'px'
			nob.style.height = ( bounds.height - 8 ) + 'px'
			return bounds
		}

		const toggle_texts = b('div', false, 'toggle-texts', 'row')

		const left_text = b('div', false, 'toggle-text', 'column', 'column-2', 'left')
		const liner_left = b('div', false, 'flex-wrapper')
		liner_left.innerText = label1 === null ? '' : ( label1 || 'off' )
		left_text.append( liner_left )
		toggle_texts.append( left_text )

		const right_text = b('div', false, 'toggle-text', 'column', 'column-2', 'right')
		const liner_right = b('div', false, 'flex-wrapper')
		liner_right.innerText = label2 === null ? '' : ( label2 || 'on' )
		right_text.append( liner_right )
		toggle_texts.append( right_text )

		wrap.append( toggle_texts )

	}else{

		const label = b('label', false, 'toggle-label')
		const span1 = b('span', false, 'mode-' + val1 )
		span1.innerText = `viewing as: ${label1}`
		label.append( span1 )
		const span2 = b('span', false, 'mode-' + val2 )
		span2.innerText = `viewing as: ${label2}`
		label.append( span2 )
		wrap.append( label )

	}

	// may want to run this again post-DOM, so return init-bounds
	setTimeout(() => {
		set_bounds()
		setTimeout(() => {
			render_toggle_state( wrap )
		}, 100 )
	}, 100 )

	return {
		wrap,
		set_bounds,
		track,
		nob,
		label: _label,
	}

} // build toggle




const empty_img_src = `/resource/media/missing-img.png`
const fail_img_src = `/resource/media/missing-img.png`






const gen_input = args => {
	const {
		name,
		type,
		value,
		label,
	} = args

	const wrap = b('div', false, 'input-wrap')
	const _label = b('label')
	_label.innerText = label || name || '-'
	const input = b('input', false, 'input')
	input.type = type
	if( typeof name !== 'undefined ') input.name = name
	if( typeof value !== 'undefined' ) input.value = value

	if( type === 'checkbox'){
		wrap.append( input )
		wrap.append( _label )
	}else{
		wrap.append( _label )
		wrap.append( b('br') )
		wrap.append( input )
	}

	return {
		input,
		wrap,
	}

}


const timestamp_to_datepicker = stamp => {
	const val = new Date( stamp ).toLocaleDateString()
	const split = val.split('/').reverse().map( value => {
		return value.padStart(2, '0')
	})
	split.push( split.splice(1,1)[0] )
	return split.join('-')
}

function decodeHtml(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}


const build_icon = slug => {
	return `<img class='icon' src='/resource/icons/${slug}'>`
}


const get_active_state = args => {
	const  {
		elapsed,
	} = args

	const _times = {
		gone: env.LOCAL ? times.second * 30 : times.minute * 10,
		idle: env.LOCAL ? times.second * 10 : times.minute * 2,
	}

	if( typeof elapsed !== 'number' ) return 'gone'

	if( elapsed > _times.gone ){
		return 'gone'
	}else if( elapsed > _times.idle ){
		return 'idle'
	}else{
		return 'active'
	}

}


const build_checkbox = args => {
	const {
		label_text,
		name,
		inline = true,
		invert = false,
	} = args

	const wrap = b('div', false, 'checkbox-wrap')
	let label
	if( label_text ){
		label = b('label')
		label.innerText = label_text
	}

	const input = b('input', false, 'input')
	input.type = 'checkbox'
	input.name = name || ''

	if( inline ){

		if( invert ){
			wrap.append( label )
			wrap.append( input )
		}else{
			wrap.append( input )
			wrap.append( label )
		}

	}else{

		if( invert ){
			wrap.append( label )
			wrap.append( b('br'))
			wrap.append( input )
		}else{
			wrap.append( input )
			wrap.append( b('br'))
			wrap.append( label )
		}

	}

	return {
		wrap,
		input,
		label,
	}

}



const build_text_input = args => {
	const {
		label_text,
		placeholder
	} = args

	const wrap = b('div', false, 'input-wrap', 'text-wrap')

	let label
	if( label_text ){
		label = b('label')
		label.innerText = label_text
		wrap.append( label )
		wrap.append( b('br') )
	}

	const input = b('input', false, 'input')
	if( placeholder ) input.placeholder = placeholder
	wrap.append( input )

	return {
		wrap,
		input,
		label,
	}

}



const build_select = args => {
	const {
		label_text,
		options,
	} = args

	if( !Array.isArray( options ) ){
		return console.error('must provide array to build-select')
	}

	const wrap = b('div', false, 'select-wrap')

	let label
	if( label_text ){
		label = b('label')
		label.innerText = label_text
		wrap.append( label )
		wrap.append( b('br') )
	}

	const select = b('select', false, 'input')
	wrap.append( select )
	for( const _option of options ){
		const opt = b('option')
		// can either pass single or 2d array:
		opt.value = _option[0] ? _option[0] : _option
		opt.innerText = _option[1] ? _option[1] : _option
		select.append( opt )
	}

	return {
		wrap,
		label,
		select,
	}

}






const syntax_types = ['is-code', 'is-ascii', 'is-poetry', 'is-text']

export {
	is_logged,
	is_admin,
	header_ele,

	// ensureHex,
	capitalize,
	random_hex,
	scry,
	is_valid_uuid,
	
	validate_number,
	random_entry,
	random_range,
	// ORIGIN,

	to_alphanum,

	is_valid_email,

	serialize,

	trimStrict,
	shift_element,
	get_index,
	offset_color,
	is_hex_color,
	
	b,
	Folder,
	build_help,

	click_parent,
	make_debounce,

	convertToHex,

	DropOptions,
	add_length_count,
	sleep,

	abbreviate,


	select_contents,
	copyToClipboard,
	is_num,

	handle_markdown,
	add_option,
	add_copy_code,
	add_select_code,
	charcode,
	auto_date,
	clear_drops,

	times,
	get_funder_name,
	get_username,
	money,
	amounts,
	disable,
	animate,
	b_label,
	get_subdir,
	build_price,
	cents_to_currency,

	base_toggle_action,
	render_toggle_state,
	build_toggle,
	empty_img_src,
	fail_img_src,
	gen_input,
	timestamp_to_datepicker,
	decodeHtml,
	build_icon,
	get_active_state,
	build_checkbox,
	build_text_input,
	build_select,
	syntax_types
}