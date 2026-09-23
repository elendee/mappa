import env from '../env.js?v=78'
import hal from '../hal.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'
import ui from '../ui.js?v=78'
import * as lib from '../lib.js?v=78'
// import GLOBAL from '../GLOBAL.js?v=78'
// import popups from '../shared_popups.js?v=78'
// import elements from '../shared_elements.js?v=78'
// import User from '../classes/User.js?v=78'
import USER from '../USER.js?v=78'
import User from '../classes/User.js?v=78'






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


