import * as lib from './lib.js'




const DRAG_MAP = new Map()

// const pending_field = 'data-pending-restore'


let diffX, diffY, dragTarget
let lastX, lastY
let memX, memY
let dragging_storage_key


const drag_ele = e => {
	if( e.target.nodeName === 'INPUT' ) return;

	diffX = e.clientX - lastX
	diffY = e.clientY - lastY

	// NB: style.left/top are relative to offsetParent, so seed from
	// parsed style (or offsetLeft/Top which share that coord space) --
	// never from getBoundingClientRect / clientX, which are viewport
	// coords and include margins (see .modal-content margin-top).
	const parsedL = parseFloat( dragTarget.style.left )
	const parsedT = parseFloat( dragTarget.style.top )
	const l = Number.isFinite( parsedL ) ? parsedL : dragTarget.offsetLeft
	const t = Number.isFinite( parsedT ) ? parsedT : dragTarget.offsetTop

	dragTarget.style.left = ( l + diffX ) + 'px'
	dragTarget.style.top = ( t + diffY ) + 'px'

	lastX = e.clientX
	lastY = e.clientY

	debounced_set_drag_position()

} // drag ele



const remove_dragging = e => {
	window.removeEventListener('mousemove', drag_ele )
}

const set_drag_position = () => {
	if( !dragging_storage_key ) return;
	localStorage.setItem( dragging_storage_key, JSON.stringify({
		left: dragTarget.style.left,
		top: dragTarget.style.top,
	}))
	console.log('set drag pos: ', dragging_storage_key )
}

const debounced_set_drag_position = lib.make_debounce( set_drag_position, 500, false, {})

const make_draggable = ( event ) => {
	const {
		ele, 
		storage_key
	} = event

	DRAG_MAP.set( ele, {
		storage_key,
	})
	ele.classList.add('draggable')
	ele.addEventListener('mousedown', handle_draggable_mousedown )

	const extant = localStorage.getItem( storage_key )

	if( extant ){
		try{
			const {
				left,
				top,
			} = JSON.parse( extant )			

			ele.style.left = left 
			ele.style.top = top

		}catch( err ){
			console.warn( err )
		}

	}

} // make draggable




const handle_draggable_mousedown = e => {

	const ele = lib.click_parent( e.target, 'draggable', false, 10 )
	const {
		storage_key,
	} = DRAG_MAP.get( ele )

	if( e.button == 2 ) return;
	if( e.target.nodeName == 'SELECT') return;
	if( storage_key ) dragging_storage_key = storage_key
	dragTarget = ele
	lastX = memX = e.clientX
	lastY = memY = e.clientY

	window.addEventListener('mousemove', drag_ele )
	window.addEventListener('mouseup', remove_dragging )

} // handle draggable


const remove_draggable = event => {
	const {
		ele,
	} = event

	ele.removeEventListener( 'mousedown', handle_draggable_mousedown )
	ele.style.left = '0px'
	ele.style.top = '0px'
}




const restore_draggable = ( event ) => {
	const {
		storage_key, 
		ele
	} = event

	const last_data = localStorage.getItem( storage_key )
	if( last_data ){
		setTimeout(() => {
			try{
				const parsed = JSON.parse( last_data )
				ele.style.left = parsed.left
				ele.style.top = parsed.top

				// console.log('restored pos', parsed )

			}catch( err ){
				console.error( err )
			}
		}, 50 )
	}else{

		_set_center_abspos( ele )

		if( env.LOCAL ) console.log('no restore pos for ' + storage_key )
	}
	
	ele.style.opacity = 1
	// ele.removeAttribute( pending_field )

} // restore draggable



const _set_center_abspos = ele => {

	const bounds = ele.getBoundingClientRect()
	const left = ( window.innerWidth / 2 ) - ( bounds.width / 2 )
	const top = ( window.innerHeight / 2 ) - ( bounds.height / 2 )

	ele.style.left = left + 'px'
	ele.style.top = top + 'px'

} // set center abspos



BROKER.subscribe('RESTORE_DRAGGABLE', restore_draggable )
BROKER.subscribe('REMOVE_DRAGGABLE', remove_draggable )
BROKER.subscribe('MAKE_DRAGGABLE', make_draggable )


export default {}