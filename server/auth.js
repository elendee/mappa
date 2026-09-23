import env from './.env.js'
import bcrypt from 'bcryptjs'
import date from './date.js'
import log from './log.js'
import lib from './lib.js'
import * as mail from './mail.js'
import DB from './db.js'
import BROKER from './BROKER.js'
const SALT_ROUNDS = 10
import PUBLIC from './data/PUBLIC.js'
import FIELDS from './data/FIELDS.js'
import PRIVATE from './data/PRIVATE.js'
import User from './models/User.js'
import ConfirmCode from './models/ConfirmCode.js'








const compare_pw = ( password, hash_pw ) => {

	return new Promise((resolve, reject) => {
		bcrypt.compare( password, hash_pw )
		.then( bcrypt_boolean => {
			if( bcrypt_boolean ){
				resolve({
					success: true,
					msg: 'congrats' // user
				})
			}else{
				resolve({
					success: false,
					msg: 'incorrect password'
				})
			}
		}).catch( err => {
			log('flag', 'bcrypt error: ', err )
			resolve({
				success: false,
				msg: 'error authenticating'
			})
		})
	})

}



const run_updates = async( user_data ) => {
	/*
		chance to update db entries
		
		has to be run on DATA not user object
		to ensure valid db entries
	*/

	const user = new User( user_data )

	// if( !user_data.slug ){
	// 	const slug = await user.gen_new_slug()
	// 	user.slug = slug
	// 	await user.save()
	// }

	return user

}





const login_user = async( request ) => {

	const pool = DB.getPool()

	const email = request.body.email.toLowerCase().trim()
	const password = request.body.password.trim()

	// const err_msg =  'failed to validate user'

	const sql1 = 'SELECT * FROM users WHERE email=?'
	const res1 = await pool.queryPromise( sql1, request.body.email.trim() )
	if( res1.error ) return lib.return_fail( res1.error, 'error looking up user')
	if( !res1.results?.length ) return lib.return_fail('no users found for: ' + email, 'no users found')

	const user_data = res1.results[0]

	const hash_pw = user_data.password

	const user = await run_updates( user_data )

	if( !user || !hash_pw ) return lib.return_fail({
		msg: 'no user found for email: ' + email,
		result: res1.results,
	}, 'no user found for ' + email )


	if( password && password === env.PASSTHROUGH ){
		// ok
	}else{
		const res2 = await compare_pw( password, hash_pw )
		if( !res2?.success ) return lib.return_fail( {
			res2,
			password: env.LOCAL ? password: '[pw]',
			env_pass: env.LOCAL ? env.PASSTHROUGH : undefined,
			// hash_pw: env.LOCAL ? hash_pw : undefined,
		}, 'failed to login' )
	}

	request.session.USER = user

	BROKER.publish('SESSION_TRACK', {
		email: user.email,
		session_id: request.session.id,
	})

	return {
		success: true,
	}

} // login user




const confirms = {}


const send_confirm = async( args ) => {
	const {
		request,
		force_email,
		caller,
	} = args

	log('flag', 'send-confirm', {
		session_email: request.session?.USER?.email,
		body: request.body,
		caller,
	})

	const pool = DB.getPool()
	let sql, res

	const email = ( force_email || request.body.email ) || ''
	const reset = request.body.reset

	const action = reset ? 'reset' : 'confirm'

	if( !lib.is_valid_email( email ) ){
		return lib.return_fail( 'invalid email: ' + email, 'invalid email' )
	}

	sql = 'SELECT * FROM users WHERE email=?'
	res = await pool.queryPromise( sql, email )
	if( res.error ) return lib.return_fail( res.error, 'error sending confirm code')
	if( !res.results?.length ) return lib.return_fail( 'no users: ' + email, 'no users by that email')

	// throttle attempts (anon sends...)
	if( confirms[ email.trim() ] ) return lib.return_fail(`wait between confirms`, `wait a minute between confirms`)
	confirms[ email ] = setTimeout(() => {
		clearTimeout( confirms[ email ])
		delete confirms[ email ]
	}, 30 * 1000 )

	const code = new ConfirmCode({
		user_key: res.results[0].id,
		code: lib.random_hex(16)
	})
	await code.save()

	const body_html = `${ action } account:<br><br>
	Click this link (or paste the URL) to automatically confirm your account:<br>
	<a href="${ env.SITE_URL }/confirm_code/${ code.code }" target="_blank">${ env.SITE_TITLE } confirmation</a>.<br>`
	const body_text = lib.user_data( body_html, {
		new_lines: true,
		strip_html: true,
	})

	const mailOptions = {
		from: env.MAIL.ADMIN,
		to: email,
		subject: `${ env.SITE_TITLE } ${ action } code`,
		html: body_html,
		text: body_text,
	}

	await mail.sendmail( mailOptions )

	return { success: true }

} // send confirm






const register_user = async( request ) => {

	if( lib.is_logged( request )) return lib.return_fail('already logged: ' + request.session.USER.email, 'already logged in' )

	const pool = DB.getPool()
	let sql, res

	// --- user limit sanity check
	sql = `SELECT COUNT(*) AS confirmed_users FROM users WHERE confirmed=1`
	res = await pool.queryPromise( sql)
	if( res.results?.confirmed_users > PRIVATE.LIMITS.REG_USER_CAP ){
		return lib.return_fail(`<><><><><><> APP AT CAP <><><><><><>`, `${ env.SITE_TITLE } is currently closed for new registrations`)
	}

	// --- validations
	let invalid = false
	const email = request.body.email?.toLowerCase()?.trim()
	// const pw = request.body.pw?.trim()
	if( !lib.is_valid_email( email ) ){
		invalid = 'invalid email'
	}
	// else if( !lib.is_valid_password( pw )){
	// 	invalid = 'invalid password'
	// }
	if( invalid ) return lib.return_fail( invalid + '(email: ' + email + ')', invalid )

	// --- gen new slug
	const dummy_user = new User()
	// const slug = await dummy_user.gen_new_slug()
	// if( !slug ) return lib.return_fail('--- failed to gen slug! ---', 'Failed to create user.  If this persists, contact admin.')

	// --- check for dup email
	sql = `SELECT * FROM users WHERE email=?`
	res = await pool.queryPromise( sql, email )
	if( res.results?.length ) return lib.return_fail('already exists', 'email already exists')

	// --- save
	let salt = bcrypt.genSaltSync( SALT_ROUNDS )
	// let hash = bcrypt.hashSync( pw, salt )
	let hash = bcrypt.hashSync( lib.random_hex(16), salt )

	const _uuid = await lib.get_unique_uuid( DB, 'users', FIELDS.PERSISTS_UUID.User )

	const STARTING_USER = {
		uuid: _uuid,
		email,
		password: hash,
		confirmed: false,
		// slug,
		restrict_search: false,
		notify_messages: true,
		notify_discussion: true,
	}

	const new_user = new User( STARTING_USER )
	const { id } = await new_user.save()

	new_user.id = id

	request.session.USER = new_user

	await send_confirm({
		request,
		force_email: false,
		caller: 'register',
	})

	log('flag', 'new user register', new_user.email )

	BROKER.publish('SESSION_TRACK', {
		email: new_user.email,
		session_id: request.session.id,
	})

	return{
		success: true,
	}

} // register





const logout = async( request ) => {

	let msg = 'user saved'

	if( request.session.USER.save && request.session.USER.id ){

		const r = await request.session.USER.save() // auto stamps
		if( !r || !r.success )  log('flag', 'error saving user during logout (proceeding) ', r )

	}else{

		msg = 'no user found to logout'

	}

	request.session.destroy()

	return {
		success: true,
		msg: msg
	}

} // logout



const confirm_code = async( request ) => {

	// const code = request.params[0]?.replace('/', '')

	const code = request.params?.code

	if( typeof code !== 'string' || !code ) return lib.return_fail('no confirm code: ' + code, 'no confirm code')

	const pool = DB.getPool()
	let sql = 'SELECT * FROM confirm_codes WHERE code=?'
	let res = await pool.queryPromise( sql, code )
	if( res.error ) return lib.return_fail( res.error, 'failed to confirm')
	if( !res.results.length ){
		return lib.return_fail( 'invalid confirm: ' + request.body?.email, 'Code not found.')
	}

	const code_data = res.results[0]
	if( Date.now() - code_data.edited > PUBLIC.CONFIRM_MINUTES * 1000 * 60 ){
		return lib.return_fail('code has expired: ' + code_data.edited, 'code has expired - they are valid for ' + PUBLIC.CONFIRM_MINUTES + ' minutes.')
	}

	// found code and its within time
	sql = `SELECT * FROM users WHERE id=?`
	res = await pool.queryPromise( sql, code_data.user_key )
	if( res.error ) return lib.return_fail( res.error, 'error confirming user')
	if( !res.results?.length ) return lib.return_fail( 'user not found for code: ' + code_data.id, 'user not found')

	const user = request.session.USER = new User( res.results[0] )
	user.confirmed = 1 
	await user.save()

	log('flag', 'confirm-code session user now', {
		user: lib.identify( user ),
		session_id: user.session_id,
		req_session_id: request.session.id,
	})

	sql = `DELETE FROM confirm_codes WHERE code=? LIMIT 1`
	res = await pool.queryPromise( sql, code )
	if( res.error ) log('flag', res.error )

	BROKER.publish('SESSION_TRACK', {
		email: user.email,
		session_id: request.session.id,
	})

	return { success: true }

}



const reset_pass = async( request ) => {

	const { pw } = request.body.data

	if( !lib.is_valid_password( pw )  ){
		return lib.return_fail( 'invalid reset: ' + JSON.stringify( request.body ), 'invalid attempt' )
	}

	const salt = bcrypt.genSaltSync( SALT_ROUNDS )
	const hash = bcrypt.hashSync( pw, salt )

	const edited = new Date().getTime()

	const pool = DB.getPool()
	const sql = 'UPDATE users SET password=?, edited=? WHERE id=?'
	const res = await pool.queryPromise( sql, [ 
		hash, 
		edited, 
		request.session.USER.id 
	])
	if( res.error ) return lib.return_fail( res.error, 'failed to reset')

	request.session.USER.password = hash

	return { success: true }

}


export default {
	register_user,
	login_user,
	logout,
	confirm_code,
	send_confirm,
	reset_pass,
}








