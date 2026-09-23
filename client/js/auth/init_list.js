import env from '../env.js?v=78'
import * as lib from '../lib.js?v=78'
import ui from '../ui.js?v=78'
import hal from '../hal.js?v=78'
import fetch_wrap from '../fetch_wrap.js?v=78'

import GLOBAL from '../GLOBAL.js?v=78'
import BROKER from '../EventBroker.js?v=78'
import WS from '../WS.js?v=78'
import media_lib from '../media_lib.js?v=78'
// import ROUTER from '../WS_ROUTER.js?v=78'
// import WORLD from '../WORLD.js?v=78'
import Alcove from '../classes/Alcove.js?v=78'
// import Order from '../classes/Order.js?v=78'

console.log('init list')




// decl 
const content = document.getElementById('content')



// lib



// bind




// init

const expl = lib.b('h2')
expl.innerText = 'Make an Alcove:'
content.append( expl )

const COVE = new Alcove()

const form = COVE.build_edit_form({
	split: false,
})

content.append( form )

// fetch_wrap('/action_main', 'post', )