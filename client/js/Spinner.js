import {
	b,
} from './lib.js'


const spinner_data = document.getElementById('spinner-data')


class Spinner {

	constructor( init ){
		init = init || {}
		this.type = init.type
		this.ele = init.ele || b('div')
		this.ele.classList.add('spinner')
		if( init.is_admin ){
			this.ele.classList.add('admin')
		}
		if( this.type === 'svg' ){
			this.img = b('div')
			this.img.classList.add('rotating')
			this.img.innerHTML = init.src || spinner_data.innerHTML
			this.img.style.width = '150px'
			this.img.style.height = '150px'
		}else{
			this.img = init.img || b('img')
			this.img.src = this.img.src || init.src
		}
		this.msg = b('div', false, 'spinner-msg')

		this.ele.append( this.img )
		this.ele.append( this.msg )

		document.body.append( this.ele )
	}

	show( ele, msg, allow_pointer ){
		if( ele ){
			ele.append( this.ele )
			this.ele.style.position = 'absolute'
			this.ele.classList.add('mini')
		}else{
			document.body.append( this.ele )
			this.ele.style.position = 'fixed'
			this.ele.classList.remove('mini')
		}
		this.msg.style.display = msg ? 'inline-block' : 'none'
		this.msg.innerHTML = msg || ''
		
		this.ele.style.display = 'flex'

		if( allow_pointer ){
			this.ele.style['pointer-events'] = 'none'
		}else{
			this.ele.style['pointer-events'] = 'initial'
		}

	}

	hide(){
		this.ele.remove()
	}

}


export default Spinner