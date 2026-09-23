/*
	fill a localStorage object for easy authentication
	it's up to the app to read the localStorage object and make use of it
	object will be of format:
	localStorage[ 'string' ] {
		[ type ]: {
			[ user ]: 'string',
			[ password ]: 'string',
		}.
		[ type ]: {
			[ user ]: 'string',
			[ password ]: 'string',
		}
	}

	help:
	examine public methods of window.EMU_AUTH 

*/

if( !window.EMU_AUTH  ){

	window.EMU_AUTH = {

		_CONFIG: {},

		_CREDS: {},

		configure: ( id_string, user_field, pw_field ) => {
			/*
				run this one time and it will be saved in localStorage
				set() is all you need after this
				this allows different labels such as "user" / "email" / "handle" etc - whatever the app uses
			*/

			EMU_AUTH._CONFIG = EMU_AUTH?._CONFIG || {}

			EMU_AUTH._CONFIG.id_string = id_string
			EMU_AUTH._CONFIG.user_field = user_field
			EMU_AUTH._CONFIG.pw_field = pw_field

			EMU_AUTH._set_config()

		},

		_set_config: () => {
			/*
				persist SELF to localStorage ( not the local credential object )
			*/

			localStorage.setItem( 'emu_auth', JSON.stringify({
				_CONFIG: EMU_AUTH?._CONFIG,
			}))

		},

		_onpageload: () => {
			/*
				fills config vars
			*/

			try{
				const existing = JSON.parse( localStorage.getItem('emu_auth') )
				EMU_AUTH._CONFIG = existing?._CONFIG
			}catch( err ){
				console.log( err )
			}
			try{
				EMU_AUTH._CREDS = JSON.parse( localStorage.getItem( EMU_AUTH?._CONFIG?.id_string ) )
			}catch( err ){
				console.log( 'emu auth err creds', err )
			}

		},

		set: ( user_label, user, pw ) => {
			/*
				the basic function for adding new creds
				saves to localStorage[ _CONFIG.id_string ] ( NOT )
				set user and pass to falseys to delete user type entirely
			*/

			if( !user_label ){
				console.log('user_label must be provided, ex: "admin", "standard", etc')
				return
			}

			if( !EMU_AUTH?._CONFIG.user_field || !EMU_AUTH?._CONFIG.pw_field || !EMU_AUTH?._CONFIG.id_string ){
				console.log('missing config vars: ', EMU_AUTH )
				return
			}

			try{

				// const local_auth 
				if( EMU_AUTH?._CONFIG.id_string ){
					EMU_AUTH._CREDS = JSON.parse( localStorage.getItem( EMU_AUTH._CONFIG.id_string ) ) || {}
				}else{
					console.log('no emu auth config')
				}

				if( !user && !pw ){ // deleting a user
					delete EMU_AUTH._CREDS[ user_label ]
				}else{ // editing a user
					EMU_AUTH._CREDS[ user_label ] = EMU_AUTH._CREDS[ user_label ] || {}
					const user_field = EMU_AUTH?._CONFIG.user_field
					const pw_field = EMU_AUTH?._CONFIG.pw_field
					user = user || EMU_AUTH[ user_label ][ user_field ]
					pw = pw || EMU_AUTH[ user_label ][ pw_field ]
					EMU_AUTH._CREDS[ user_label ][ user_field ] =  user
					EMU_AUTH._CREDS[ user_label ][ pw_field ] = pw
				}

				if( EMU_AUTH?._CONFIG.id_string ){
					localStorage.setItem( EMU_AUTH?._CONFIG.id_string, JSON.stringify( EMU_AUTH._CREDS ) )
				}

			}catch( err ){
				console.log( err )
			}
		},

		print: () => {
			let users = ''
			for( const type in EMU_AUTH._CREDS ){
				users += `${ type }: ${ EMU_AUTH._CREDS[ type ][ EMU_AUTH?._CONFIG?.user_field ] } ${ EMU_AUTH._CREDS[ type ][ EMU_AUTH?._CONFIG?.pw_field ] }
`
			}
			const text = `
emu auth users:
${ users }
`
			console.log( text )
			console.log(`auth code must check for: 
${ EMU_AUTH?._CONFIG?.id_string }
${ EMU_AUTH?._CONFIG?.user_field }
${ EMU_AUTH?._CONFIG?.pw_field }`)
		}

	}

	// init
	EMU_AUTH._onpageload()

}

export default {}