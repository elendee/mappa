import env from '../env.js'
import * as lib from '../lib.js'
import ui from '../ui.js'
import hal from '../hal.js'
import fetch_wrap from '../fetch_wrap.js'

import GLOBAL from '../GLOBAL.js'
import BROKER from '../EventBroker.js'
import WS from '../WS.js'
import media_lib from '../media_lib.js'
// import ROUTER from '../WS_ROUTER.js'
// import WORLD from '../WORLD.js'
import Alcove from '../classes/Alcove.js'
// import Order from '../classes/Order.js'

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