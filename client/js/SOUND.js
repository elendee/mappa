import env from './env.js?v=78'
import hal from './hal.js?v=78'

import BROKER from './EventBroker.js?v=78'

import gen_audio_toggle from './gen_audio_toggle.js?v=78'








const audio = gen_audio_toggle()
document.body.appendChild( audio )





let subbed
// live_loop, register_loop

const registered_persistents = {}
const live_persistents = {}
const self_persistents = {}


const score_families = {
	default: ['pessoa'], //'pessoa' // jet_engine_industrial
}





// const settings = {
// 	volume: 1,
// }


const sounds = {

	// ui: {
	// 	flip: {
	// 		src: ['/resource/sound/phone_close.mp3'],
	// 	},
	// 	blip: {
	// 		src: ['/resource/sound/blip.mp3'],
	// 	},
	// 	hal: {
	// 		src: ['/resource/sound/alert_hal.mp3'],
	// 	},
	// 	swoosh1: {
	// 		src: ['/resource/sound/swoosh1.mp3'],
	// 	},
	// 	equip: {
	// 		src: ['/resource/sound/equip.mp3'],
	// 	},
	// },

	fx: {
		laser: {
			src: ['/resource/sound/laser.mp3'],
		},
		laser_impact1: {
			src: ['/resource/sound/laser_impact1.mp3'],
		},
		laser_impact2: {
			src: ['/resource/sound/laser_impact2.mp3'],
		},
		rock_breaking: {
			src: ['/resource/sound/rock_breaking.mp3'],
		},
		explode_short: {
			src: ['/resource/sound/explode_short.mp3'],
		},
		explosion: {
			src: ['/resource/sound/explode_short.mp3'],
		},
		pulse_canister: {
			src: ['/resource/sound/launch_quick.mp3'],
		},
		alert_standard: {
			src: ['/resource/sound/alert_standard.mp3'],
		},
		hover_aura: {
			src: ['resource/sound/hover_aura.mp3'],
		},
		power_down_low: {
			src: ['/resource/sound/power_down_low.mp3'],
		},
		power_down_medium: {
			src: ['/resource/sound/power_down_medium.mp3'],
		},
		collide: {
			src: ['/resource/sound/ship_collide.mp3'],
		},
		hydraulic: {
			src: ['/resource/sound/hydraulic.mp3'],
		},
		airlock: {
			src: ['/resource/sound/airlock.mp3'],
		},
		whoosh: {
			src: ['/resource/sound/missile_whoosh.mp3']
		},
	},

	score: {
		pessoa: {
			src: ['/resource/score/pessoa.mp3'],
		},
		jet: {
			src: ['/resource/score/jet_engine_industrial.mp3'],
		},
	},

	loops: {
		thrust: {
			src: ['/resource/sound/thrust4.mp3'],
		},
		pulse: {
			src: ['/resource/sound/pulse.mp3'],
		},
		tonal: {
			src: ['/resource/sound/freighter-tone.mp3'],
		},
		laser: {
			src: ['/resource/sound/laser.mp3'],
		},
		hover_aura: {
			src: ['resource/sound/hover_aura.mp3'],
		},
	}

}


const arbitary_sound_scalar = window.arbitary_sound_scalar = 250

const scale_howler_pos = vector => {

	const howler_pos = []

	for( const coord of vector.toArray() )	{
		howler_pos.push( coord / window.arbitary_sound_scalar ) 
	}

	return howler_pos

}




const single_howl = event => {
	const {
		type,
		source_mesh,
		subtype,
		volume,
		echo,
		fade_in,
	} = event

	const player1 = !source_mesh

	if( !type || !sounds[ type ] || ( source_mesh && !source_mesh.position ) ){
		console.log('could not play sound: ', event )
		return false
	}

	const data = sounds[ type ][ subtype ]

	if( !data ){
		console.log('could not play sound: ', event )
		return false
	}

	const howl = new Howl( data )
	if( type === 'ui' && subtype === 'blip' ){
		howl.volume( .3 )
	}else{
		howl.volume( typeof volume === 'number' ? volume : 1 )
	}

	// console.log('howl: ', event )

	if( echo ){

		if( echo.stagger ){ 

			for( let i = 0; i < echo.length; i++ ){
				setTimeout(() => {
					if( !player1 )  howl.pos( ...scale_howler_pos( source_mesh.position ) )
					howl.play()
				}, i * ( .5 + ( echo.interval * Math.random() ) ) )
			}

		}else{ // normal echo
			for( let i = 0; i < echo.length; i++ ){
				setTimeout(() => {
					if( !player1 )  howl.pos( ...scale_howler_pos( source_mesh.position ) )
					howl.play()
				}, i * echo.interval )
			}
		}

	}else{

		if( !player1 )  howl.pos( ...scale_howler_pos( source_mesh.position ) )

		if( fade_in ){
			howl.fade(0, 1, fade_in )	
		}
		howl.play()

	}

	return howl

}




const persist_howl = event => {

	const {
		type,
		subtype,
		volume,
		source_mesh,
		source_uuid,
		fade_in,
		fade_out,
		player1,
	} = event

	if( !type || !type.match(/loops/) || !subtype || !source_uuid ){
		console.log('invalid sound loop', event )
		return false
	}

	const key = type + subtype + source_uuid
	if( registered_persistents[ key ] ){ // happens a lot due to async load - sound cannot be bound until model loads
		// console.log('double registered persistent: ', key )
		return false
	}

	// if( sounds[ type ][ subtype ].sound_loop ){
	// 	console.log('sound already being played', key )
	// 	return false
	// }
	
	// sounds[ type ][ subtype ].sound_loop = true

	const persistent = {
		// uuid: lib.random_hex( 16 ),
		key: key,
		sound: new Howl( sounds[ type ][ subtype ] ),
		volume: volume,
		source_mesh: source_mesh,
		fade_in: fade_in, 
		fade_out: fade_out,
	}

	persistent.sound.volume( persistent.volume )

	// const player1 = !source_mesh

	if( player1 ){ // doesnt need source_mesh, no scale()

		self_persistents[ key ] = persistent
		self_persistents[ key ].sound.play()
		self_persistents[ key ].sound.on('end', (a, b, c) => { // (howler callback)
			if( self_persistents[ key ] ){
				self_persistents[ key ].sound.play()
			}
		})

	}else{

		if( !persistent.source_mesh || !persistent.source_mesh.position ){
			console.log('invalid persistent', persistent)
			return false
		}
		registered_persistents[ key ] = persistent
		registered_persistents[ key ].sound.on('end', (a, b, c) => {
			if( live_persistents[ key ] ){
				if( !registered_persistents[ key ] ){
					// console.log('sound was unregistered: ', key )
					delete live_persistents[ key ]
					return false
				}
				registered_persistents[ key ].sound.pos( ...scale_howler_pos( registered_persistents[ key ].source_mesh.position ) )
				registered_persistents[ key ].sound.play()
			}
		})

	}

	return persistent.key
 
}




const unpersist_howl = key => {

	// console.log('stop: ', key )

	if( !key || ( !self_persistents[ key ] && !registered_persistents[ key ] ) ){
		console.log('invalid unpersist howl', key )
		return false
	}

	let group, howl

	if( self_persistents[ key ] ){
		group = self_persistents
	}else if( registered_persistents[ key ] ){
		group = registered_persistents
	}else{
		console.log('invalid howl key', key )
		return false
	}

	howl = group[ key ]

	if( howl.fade_out ){
		howl.sound.fade( howl.sound.volume(), 0, howl.fade_out )
		delete group[ key ]
		howl.sound.on('fade', () => {
			// console.log('done fading out')
			// delete group[ key ]
		})
	}else{
		howl.sound.stop()
		delete group[ key ]
	}

}







const init_intervals = player1 => {

	// hal('error', 'aborting spatial audio (dev)', 5000)
	// return false

	// crazy mem leak on registered sounds

	if( !player1.player1 ){
		if( env.LOCAL ) hal('error', 'invalid init intervals')
		console.log('invalid init_intervals')
		return false
	}

	let dist
	// registered and in range
	let live_loop = setInterval(() => {

		Howler.pos( ...scale_howler_pos( player1.box.position ) )

		for( const key in live_persistents ){
			if( !registered_persistents[ key ] ){
				// console.log('sound was unregistered: ', key )
				delete live_persistents[ key ]
				continue
			}
			registered_persistents[ key ].sound.pos( ...scale_howler_pos( registered_persistents[ key ].source_mesh.position ) )
		}

	}, 500 )


	let register_loop = setInterval(() => {

		// registered but possibly out of range 
		for( const key in registered_persistents ){
			// console.log( key )
			dist = registered_persistents[ key ].source_mesh.position.distanceTo( player1.box.position )
			// console.log('dist: ', dist )
			if( live_persistents[ key ] ){

				// unset live_persistent
				if( dist > 5000 ){
					registered_persistents[ key ].sound.fade( registered_persistents[ key ].sound.volume(), 0, registered_persistents[ key ].fade_out || 1000 )
					delete live_persistents[ key ]
					// console.log('unregister sound userData: ', registered_persistents[ key ].source_mesh.userData.type )
				}
			}else{

				// set live_persistent
				if( dist < 5000 ){
					live_persistents[ key ] = true
					// registered_persistents[ key ]
					registered_persistents[ key ].sound.pos( ...scale_howler_pos( registered_persistents[ key ].source_mesh.position ) )
					registered_persistents[ key ].sound.play()
					registered_persistents[ key ].sound.fade( 0, registered_persistents[ key ].volume || 1, registered_persistents[ key ].fade_in || 500 )
				}
			}
		}

	}, 3000)

}




class SoundTrack {

	constructor( init ){
		init = init || {}
		this.family = init.family
		this.track = init.track
		this.audio = init.audio
		this.volume = 0
		this.index = 0
		this.stamp = 0
		// family: 'default',
		// sound: false,
		// index: 0,
		// stamp: 0,
	}

	get(){
		return {
			family: this.family,
			track: this.track,
		}
	}

	set( event ){

		event = event || {}

		const { family, track } = event

		if( family && score_families[ family ] ){
			this.family = score_families[ family ]
		}else{
			this.family = score_families.default
		}

		if( track && this.family.includes( track ) ){
			this.index = this.family.indexOf( track )
		}else{
			this.index = 0
		}

		const slug = this.family[ this.index ]
		this.audio = new Howl( sounds.score[ slug ] )

	}

	play(){
		const st = this
		if( !st.audio ) st.set()
		st.audio.volume( this.volume )
		st.audio.play()
		st.audio.on('end', () => {
			st.index++
			if( st.index > st.family.length ) st.index = 0
			st.set({
				family: false, 
				track: st.family[ st.index ],
			})
			// st.audio.volume( st.volume )
			st.play()
		})
	}

	pause(){
		if( this.audio )  this.audio.pause()
	}

	set_volume( event ){
		this.set()
		const value = Number( event || 0 )
		this.volume = value / 10
		this.audio.volume( this.volume )
	}

}

const soundtrack = new SoundTrack()
if( env.EXPOSE ) window.soundtrack = soundtrack

const st_set = event => {
	soundtrack.set( event )
}
const st_pause = () => {
	soundtrack.pause()
}
const st_play = () => {
	soundtrack.play()
}
const st_volume = event => {
	soundtrack.set_volume( event )
}



const set_volume = ( event, init ) => {

	// const { number, remote_control } = event 

	if( typeof event !== 'number' ) return false

	Howler.volume( event / 10 )	

	if( !init ){
		BROKER.publish('SETTINGS_UPDATE', {
			volume: event,
		})
	}

}


set_volume( 0, true )



const button_noise = () => {
	single_howl({
		type: 'ui', 
		subtype: 'blip',
		// self: true,		
	})
}

const slot_noise = () => {
	single_howl({
		type: 'ui', 
		subtype: 'equip',
		// self: true,		
	})	
}

const purge = event => {
	const { uuid } = event
	let regex
	for( const key in registered_persistents ){
		regex = new RegExp( key, 'i' )
		if( key.match( regex ) ){
			BROKER.publish('SOUND_STOP_LOOP', key )
		}
	}
}



if( !subbed ){

	document.addEventListener('visibilitychange', event => {
		Howler.mute( document.visibilityState !== 'visible' )
	})

	BROKER.subscribe('SOUND_INIT_INTERVALS', init_intervals )
	BROKER.subscribe('SOUND_PLAY', single_howl )
	BROKER.subscribe('SOUND_STOP_LOOP', unpersist_howl )
	BROKER.subscribe('SOUND_VOLUME', set_volume )
	BROKER.subscribe('SOUND_UI_NOISE', button_noise )
	BROKER.subscribe('SOUND_SLOT_NOISE', slot_noise )
	BROKER.subscribe('SOUND_PURGE', purge )


	BROKER.subscribe('SOUND_TRACK_SET', st_set )
	BROKER.subscribe('SOUND_TRACK_PLAY', st_play )
	BROKER.subscribe('SOUND_TRACK_PAUSE', st_pause )
	BROKER.subscribe('SOUND_TRACK_VOLUME', st_volume )

	if( env.EXPOSE ){
		window.sounds = sounds
		window.registered_persistents = registered_persistents
		window.live_persistents = live_persistents
		window.self_persistents = self_persistents

	}
	
	subbed = true

}




export { //  default
	sounds,
	single_howl,
	persist_howl,
	init_intervals,
}
