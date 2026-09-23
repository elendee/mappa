// const cache = '?v=78'
import log from '../server/log.js'
import lib from '../server/lib.js'
import env from '../server/.env.js'
// import CACHE from '../server/CACHE.js'
import PUBLIC from '../server/data/PUBLIC.js'
import PRIVATE from '../server/data/PRIVATE.js'
import SVGS from '../server/data/SVGS.js'








const build_meta = ( title, desc, url, meta_desc ) => {

	const fonts = ''

	return `
	<title>${ env.SITE_TITLE + ( title ? ': '+title : '' ) }</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1">
	<meta name="Description" content=" ${ desc || env.SITE_DESC }">
	<meta property="og:url" content="${ url || env.SITE_URL }">
	<meta property="og:title" content="${ title || env.SITE_TITLE }">
	<meta property="og:description" content="${ meta_desc || env.SITE_META_DESC }"> 
	<meta property="og:image" content="${ env.SITE_IMAGE }"/>
	${ fonts }
	<link rel='icon' href='/resource/media/favicon.ico'/>`

}


const popups = `
<div id='dev'></div>
<div id='alert-contain'></div>`

const global_data = () => { 
	const _string = JSON.stringify( PUBLIC )
	return `<div id="global-data" class='data-embed'>${ _string }</div>` 
}

const scripts = {
	// auth
	dashboard: `<script type='module' defer='defer' src='/js/auth/init_dashboard.js?v=78'></script>`,
	default: `<script type='module' defer='defer' src='/js/auth/init_default.js?v=78'></script>`,
	add: `<script type='module' defer='defer' src='/js/auth/init_add.js?v=78'></script>`,
	admin: `<script type='module' defer='defer' src='/js/auth/init_admin.js?v=78'></script>`,
	contact: `<script type='module' defer='defer' src='/js/auth/init_contact.js?v=78'></script>`,
	user: `<script type='module' defer='defer' src='/js/auth/init_user.js?v=78'></script>`,
	await_confirm: `<script type='module' defer='defer' src='/js/auth/init_await-confirm.js?v=78'></script>`,
	send_confirm: `<script type='module' defer='defer' src='/js/auth/init_send-confirm.js?v=78'></script>`,
	redirect: `<script type='module' defer='defer' src='/js/auth/init_redirect.js?v=78'></script>`,
	error: `<script type='module' defer='defer' src='/js/auth/init_error.js?v=78'></script>`,
}


const styles = {

	// auth
	dashboard: `<link href='https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css' rel='stylesheet' />
	<link rel='stylesheet' href='/css/dashboard.css?v=78'>`,
	base: `<link rel='stylesheet' href='/css/base.css?v=78'>`,
	models: `<link rel='stylesheet' href='/css/models.css?v=78'>`,
	auth: `<link rel='stylesheet' href='/css/auth.css?v=78'>`,
	add: `<link rel='stylesheet' href='/css/add.css?v=78'>`,
	user: `<link rel='stylesheet' href='/css/user.css?v=78'>`,
	admin: `<link rel='stylesheet' href='/css/admin.css?v=78'>`,
	modal: `<link rel='stylesheet' href='/css/modal.css?v=78'>`,
	popups: `<link rel='stylesheet' href='/css/popups.css?v=78'>`,

	chat: `<link rel='stylesheet' href='/css/chat.css?v=78'>`,

	highlight_light: `<link id='highlight-light' rel='stylesheet' href='/node_modules/highlight.js/styles/paraiso-light.min.css'>`,
	highlight_dark: `<link id='highlight-dark' rel='stylesheet' href='/node_modules/highlight.js/styles/night-owl.min.css'>`,

	ele_user: `<link rel='stylesheet' href='/css/ele_user.css?v=78'>`,

	// pages
	page: `<link rel='stylesheet' href='/css/page.css?v=78'>`,

}





const links_main = request => {

	return `
		<div id='dark-toggle' class='menu-item svg'>
			${ SVGS.dark_mode }
		</div>`

}

// standalone cluster — outside nav/panel, state rendered server-side.
// unlogged: login/register open the auth modal (auth.js binds .menu-item.login/.register).
// logged: profile/logout plain links. about + admin (if admin) always included.
// data-auth / data-admin mirror state for CSS hooks.
const auth_standalone = request => {

	const logged = !!lib.is_logged( request )
	const admin = !!lib.is_admin( request )

	return `
	<div id='auth-standalone' data-auth='${ logged }' data-admin='${ admin }'>
		${ logged ? `
		<div class='menu-item auth-profile logged'>
			<a href='/profile'>profile</a>
		</div>
		<div class='menu-item auth-logout logged'>
			<a href='/logout'>logout</a>
		</div>` : `
		<div class='menu-item login unlogged'>
			login
		</div>
		<div class='menu-item register unlogged'>
			register
		</div>` }
		<div class='menu-item auth-about'>
			<a href='/about'>about</a>
		</div>
		${ admin ? `
		<div class='menu-item auth-admin admin-color'>
			<a href='/admin'>admin</a>
		</div>` : '' }
	</div>`

} // auth standalone

const links_misc = request => {
	return ''
}

const uses_header = ['stacks', 'bookshelf']

const build_header = function( type, request, header ){
	/*
		possibly not used at this point
		maybe just admin page etc
	*/

	const user = request.session?.USER

	return `

	<div id='mobile-toggle'>
		${ SVGS.hamburger }
	</div>
	<div id='mobile-toggle-sub' style='display:none'>
		<div id='toggle-friends' class='toggle'>${ SVGS.groups }</div>
		<div id='toggle-room' class='toggle'>${ SVGS.lounge }</div>
	</div>

	${ auth_standalone( request ) }

	<div id='spinner-data' class='data-embed'>
		${ SVGS.spinner }
	</div>

	${ user ? `
	<div id='user-data' class='data-embed'>
		${ stringify_user( user, request ) }
	</div>` : '' }`
	
} // build header



/*
	old way of doing SVGs

	<!div id='global-svgs' class='data-embed'>
		<div data-key='rolodex'>${ SVGS.rolodex }</div>
	</div>
*/


const stringify_user = ( user, request ) => {
	const excepted = user.get_request_allowed( request )
	const s = JSON.stringify( user.publish( ...excepted ) )
	return s
}



const page_titles = {

}

const page_title = ( type, svg, sub_svg ) => {
	const svg_content = SVGS[ svg ]?.[ sub_svg ] || SVGS[ svg ]
	return `
	<div class='page-title-wrap'>
		${ svg_content ? `<div class='page-logo has-path-color'>${ svg_content }</div>` : '' }
		<h3 class='page-title'>
			${ page_titles[ type ] || type.replace(/_/g, ' ') }
		</h3>
	</div>`
}


const custom_postprocessors = {

	admin: data => {
		let adds = ''
		return adds
	},

} // custom post-process



const global_styles = `
${ styles.base }
${ styles.modal }
${ styles.models }
${ styles.popups }
${ styles.ele_user }
`























const render = ( type, request, data ) => {

	try{
	
		let css_includes = global_styles

		let script_includes = ''

		if( PRIVATE.pages.includes( type ) ){
			css_includes += `<link rel='stylesheet' href='/css/${ type }.css?v=78'>`
			script_includes += `<script type='module' src='/js/auth/init_${ type }.js?v=78'></script>`
		}

		switch( type ){

		case 'dashboard':

			css_includes += styles.dashboard
			script_includes += scripts.dashboard

			// merged: #header removed, nav lives inside #layer-panel > #panel-nav (plain)
			const _user = request.session?.USER
			const _embeds = `
				<div id='mobile-toggle'>${ SVGS.hamburger }</div>
				<div id='spinner-data' class='data-embed'>${ SVGS.spinner }</div>
				${ _user ? `<div id='user-data' class='data-embed'>${ stringify_user( _user, request ) }</div>` : '' }`

			return `
			<html>
				<head>
					${ build_meta()}
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ popups }
					${ global_data() }
					${ _embeds }
					${ auth_standalone( request ) }
					<div id='content'>
						<div id='map-wrap'>
							<div id='map'></div>
							<div id='layer-panel' data-auth='${ !!lib.is_logged( request ) }' data-admin='${ !!lib.is_admin( request ) }'>
				
								<div id='gear'>
									<img src='/resource/icons/gear.png'>
								</div>

								<div id='panel-nav'>
									${ links_main( request ) }
									${ links_misc( request ) }
								</div>

								<div id='global-layers-section' class='nav-section'>
									<div id='global-layers-header'>
										<button class='panel-toggle'>-</button>
										<h4 class='section-title'>Base Layers</h4>
										<button class='info-btn' data-info='base'>?</button>
									</div>
									<div id='global-layer-list'></div>
								</div>
								<hr>

								<div id='user-layers-section' class='nav-section'>
									<div id='layer-panel-header'>
										<button class='panel-toggle'>-</button>
										<h4>Your Layers</h4>
										<button class='info-btn' data-info='user'>?</button>
									</div>
									<div id='add-layer-row'>
										<button id='add-layer' class='button prime'>+ create layer</button>
									</div>
									<div id='layer-list'></div>
									<div class='layer-login-prompt hidden'>
										<span class='menu-item login login-link'>Log in</span> to create and toggle layers.
									</div>
								</div>

								<div id='other-layers-section' class='nav-section'>
									<div id='layer-panel-header'>
										<button class='panel-toggle'>-</button>
										<h4>Other Layers</h4>
										<button class='info-btn' data-info='other'>?</button>
									</div>
									<div id='find-layer-row'>
										<button id='find-layer' class='button prime'>+ find layer</button>
									</div>
									<div id='find-layer-list'></div>
									<div class='layer-login-prompt hidden'>
										<span class='menu-item login login-link'>Log in</span> to create and toggle layers.
									</div>
								</div>

							</div>
						</div>
					</div>
				</body>
			</html>`



		case 'profile':

			css_includes += styles.auth

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ build_header( type, request, 'profile' ) }
					${ popups }
					${ global_data() }
					<div id='content'>

						${ page_title( type, 'person' ) }

						<div id='user-sections'>
							<!-- contains js generated sections -->
						</div>

						<div id='notifications'>
							<!-- is appended by js -->
							${ notifications( request ) }
						</div>

					</div>

				</body>
			</html>`


		case 'about':
			// custom overwrite here:
			css_includes = styles.base
			script_includes = '' // trigger 'init-default'

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ build_header( type, request, 'contact' ) }
					${ popups }
					${ global_data() }
					<div id='content'>
						${ page_title( type ) }
						<div class='text-block'>
							TBD...
						</div>
						<h3>Privacy Policy</h3>
						<p>
							<a href='/privacy'>Our Privacy Policy</a>
						</p>
					</div>

				</body>
			</html>`

		case 'contact':

			css_includes += styles.auth
			script_includes += scripts.contact 

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ build_header( type, request, 'contact' ) }
					${ popups }
					${ global_data() }
					<div id='content'>
						${ page_title( type ) }
						<div id='contact-form'>
							<p>
								Questions, concerns or thoughts about the weather.
							</p>
							<p>
								Your message will be delivered to the site admin.
							</p>
							<input name='email' placeholder='your email (optional)' class='input'>
							<br>
							<textarea name='message' placeholder='your message' class='input'></textarea>
							<br>
							<div id='contact' class='button submit'>
								submit
							</div>
						</div>
					</div>

				</body>
			</html>`


		case 'user':

			css_includes += styles.user
			script_includes += scripts.user 

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ build_header( type, request, 'user' ) }
					${ popups }

					<div id='content'>
						${ page_title( type ) }
					</div>

					<div id='page-user' class='data-embed'>
						${ JSON.stringify( data.user ) }
					</div>
					<div id='anon-svg' class='data-embed'>
						${ SVGS.boople }
					</div>

					${ global_data() }
				</body>
			</html>`



		case 'await_confirm':

			css_includes += styles.auth 
			script_includes += scripts.await_confirm 

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ build_header( type, request, 'await confirm' )}
					${ popups }
					${ global_data() }
					<div id='content'>
					</div>
				</body>
			</html>
			`


		case 'admin':

			css_includes += styles.auth + styles.admin
			script_includes += scripts.admin 

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ build_header( type, request, 'admin' )}
					${ popups }
					${ global_data() }
					<div id='content'>
						${ page_title( type )}
						<div id='admin-views'>
							<!-- all js in here -->
						</div>
						<div id='admin-content'>
						</div>
					</div>
					${ custom_postprocessors.admin( data ) }
				</body>
			</html>
			`

		
		case 'confirm':

			css_includes += styles.auth

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>

					${ popups }
					${ global_data() }
					${ build_header( type, request, 'confirm' )}

					<h4>email confirm</h4>

				</body>
			</html>`


		case 'redirect':

			script_includes += scripts.redirect

			return `
			<html>
				<head>
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					<div id='redirect' data-redirect='${ data }'></div>
				</body>
			</html>`

		case 'error':

			script_includes += scripts.error
			css_includes += styles.page

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ build_header( type, request, {} )}
					${ popups }
					${ global_data() }
					<div id='content'>
						${ typeof data === 'string' ? data : 'There was an error fulfilling this request' }
					</div>
				</body>
			</html>
			`

		case '404':

			css_includes += styles.auth
			script_includes += scripts.error // need to include some script..

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ popups }
					${ global_data() }
					${ build_header( type, request, '404' )}
					<div id='content'>
						<div class='fourohfour'>
							nothing to see here - check your URL<br>
							<a href='/'>click here</a> to return to base
						</div>
					</div>
				</body>
			</html>`

		default:

			if( PRIVATE.pages.includes( type ) ){

				css_includes += styles.auth + ( styles[ type ] || '' )
				script_includes += ( scripts[ type ] || '' )

				return `
				<html>
					<head>
						${ build_meta() }
						${ css_includes }
						${ scriptz( script_includes ) }
					</head>
					<body class='${ type }'>
						${ build_header( type, request, type ) }
						${ popups }
						${ global_data() }
						<div id='content'>
							${ page_title( type, type ) }
						</div>
						${ custom_postprocessors[ type ] ? custom_postprocessors[ type ]( data ) : '' }
					</body>
				</html>`
				
			}

			css_includes += styles.auth
			script_includes += scripts.error // need to include some script..

			return `
			<html>
				<head>
					${ build_meta() }
					${ css_includes }
					${ scriptz( script_includes ) }
				</head>
				<body class='${ type }'>
					${ popups }
					${ global_data() }
					${ build_header( type, request, '404' ) }
					<div id='content'>
						<div class='fourohfour'>
							nothing to be found here - check your URL<br>
							<a href='/'>click here</a> to return to base
						</div>
					</div>
					${ custom_postprocessors[ type ] ? custom_postprocessors[ type ]( data ) : '' }
				</body>
			</html>`

		}

	}catch( err ){
		log('flag', 'render err: ', err )
		return '<div>error rendering page</div>'
	}

} // render




const scriptz = includes => {
	return includes || scripts.default
}






const notifications = ( request ) => { 
	const user = request.session.USER
	let html = ''

	for( const key in PUBLIC.NOTIFICATIONS ){
		html += `
		<div class='notify-wrap'>
			<input type='checkbox' class='input' name='${ key }' ${ user?.[ 'notify_' + key ] ? 'checked' : '' }>
			<label>
				<b>${ PUBLIC.NOTIFICATIONS[key].label || key }</b>:<br>
				${ PUBLIC.NOTIFICATIONS[key].desc }
			</label>
		</div>`
	}
	return html
}







export default render
