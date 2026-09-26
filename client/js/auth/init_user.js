import env from '../env.js'
import hal from '../hal.js'
import fetch_wrap from '../fetch_wrap.js'
import ui from '../ui.js'
import * as lib from '../lib.js'
// import GLOBAL from '../GLOBAL.js'
// import popups from '../shared_popups.js'
// import elements from '../shared_elements.js'
// import User from '../classes/User.js'
import USER from '../USER.js'
import User from '../classes/User.js'






// decl
let PAGE_USER
const content = document.getElementById('content')






// lib







// bind







// init

try{

	const user_data = JSON.parse( document.getElementById('page-user').innerHTML )
	const anon_svg = document.getElementById('anon-svg')?.innerHTML

	PAGE_USER = new User( user_data, anon_svg )
	if( env.EXPOSE ) window.PAGE_USER = PAGE_USER

	const is_self = USER.uuid === PAGE_USER.uuid

	const user_ele = PAGE_USER.output_page({
		include_contact: lib.is_logged,
		is_self,
	})

	content.append( user_ele )

}catch( err ){
	console.error( err )
}


