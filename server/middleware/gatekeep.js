import auth from '../auth.js'
import User from '../models/User.js'
import log from '../log.js'
import lib from '../lib.js'
import render from '../../client/map_html.js'
import color from '../color.js'
import alert_err from '../alert_err.js'



const routes = {

	GET: {
		logged: [
			'account', 
			'send_confirm',
			// 'dashboard',
		],
	}, 	
	POST: {
		logged: [
			// 'account_action',
			// 'action',
			'admin',
		],
	}

}


const skiplog_actions = [
	'get_svg',
]

const skiplog_routes = [
	'/meshes',
	'/emu_status',
]

let bare_path, ip

export default function(req, res, next) {

	try{

		req.session.USER = new User( req.session.USER )
		req.session.USER.session_id = req.session.id
		
		if( req.path.match(/\/resource/) || req.path.match(/\/client/) ){

			next()

		}else{
			
			ip = ( req.headers['x-forwarded-for'] || req.connection.remoteAddress || '' ).split(',')[0].trim()

			bare_path = req.path.replace(/\//g, '')

			logbook({
				ip, 
				req,
			})

			if( !routes[ req.method ] ){

				next()

			}else{

				// log('flag', 'request path : ', req.path )

				const requires_logged = routes[ req.method ].logged.includes( bare_path )

				if( requires_logged ){ // required logged in routes 

					if( !lib.is_logged( req ) ){ // reject

						if( req.method.match(/get/i) ){
							return res.send( render('redirect', req, '' ))
						}else{
							return res.json({
								success: false,
								msg: 'must be logged in',
							})
						}

					}else{ // logged in 

						if( !req.session.USER.confirmed ){

							const {
								reset_time,
							} = req.session.USER


							let elapsed_since_reset
							if( reset_time ){
								elapsed_since_reset = Date.now() - new Date( reset_time ).getTime()
							}

							// user is not confirmed, and has an old reset code
							// send a new one
							if( !reset_time || elapsed_since_reset > lib.times.day ){ 

								req.session.USER.confirm_code = lib.random_hex( 6 )

								const force_email = req.session?.USER?.email

								if( force_email ){

									req.session.USER.save()
									.then( res => {

										auth.send_confirm({
											request: req,
											force_email,
											caller: 'auto-gatekeep',
										})
										.catch( err => {
											log('flag', 'err sending reset gatekeep ', err )
										})
									})
									.catch( err => log('flag', 'err setting confirm : ', err ))

								}else{
									alert_err(`user is logged in but with no email`, `user is logged in but with no email`)
								}

							}

							// verrry important: infinite EMAIL-SENDING loop otherwise
							req.session.destroy()

							return res.send( render('redirect', req, 'await_confirm' ) )
						}

						next()

					}

				}else if( req.path.match(/admin/i) && !lib.is_admin( req ) ){

					// log('flag', 'admin path' )

					return res.send( render('redirect', req, '' ) )

				}else {

					next()

				}

			}

		}
		
	}catch(err){
		log('flag', 'gatekeep err', err )
		next()
	}

}



const logbook = ( args ) => {
	const {
		ip,
		req,
	} = args

	const {
		method,
		path,
		session,
		body,
	} = req

	let action = body?.action
	if( body?.search_type ) action += ':' + body.search_type

	if( path.match(/well-known/)) return;

	if( path && skiplog_routes.includes( path ) ) return;// 'SKIP_PATH'
	if( skiplog_actions.includes( action ) ) return;// 'SKIP_ACTION'

	log('gatekeep', format({
		ip,
		req,
		action,
	}))

}



function format( data ){
	const {
		ip,
		req,
		action,
	} = data

	const {
		method,
		path,
		url,
		session,
		body,
	} = req

	// log('flag', 'ERRR,, WOT', method, path, body )

	const user = session?.USER
	const _email = user?.email

	return ` ${ color('orange', ip ) } ${ print_method( method, url ) } ${ color('lgreen', action || '' )} ${ _email ? color('magenta', _email ) : 'none' }`
}



const color_method = method => {
	if( method.match(/post/i)){
		return 'lblue'
	}else if( method.match(/get/i)){
		return 'blue'
	}else if( method.match(/option/i)){
		return 'magenta'
	}else{
		return 'lgrey'
	}
}


function print_method( method, data ){
	return color( color_method( method ), data )
}

