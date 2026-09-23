import env from './.env.js'
import { exec } from 'child_process';
import lib from './lib.js'
import log from './log.js'
import DB from './db.js'
import User from './models/User.js'
import BROKER from './BROKER.js'
import STORE_HANDLER from './STORE_HANDLER.js'
import * as CRUD from './CRUD.js'
import SVGS from './data/SVGS.js'




const action = async( request, response ) => {

	if( !lib.is_admin( request )) return lib.return_fail( 'admin request blocked to non-admin', 'you must be an admin to perform that action')

	const user = request.session.USER

	const pool = DB.getPool()
	let sql, res

	let text, author, authorship, flag

	let tar_user, now, count, excepted, value, allowed, place

	const unique = {}
	const states = {}
	const results = []

	// const stripe_mode = env.STRIPE.LIVE ? 'live' : 'test'

	const { action} = request.body

	switch( action ){

	case 'view_sessions':

		BROKER.publish('SESSION_SEND_RESPONSE', {
			request,
			response,
		})
		return {
			success: true,
			handles_self: true,
		}

	case 'users':

		sql =  `SELECT * FROM users WHERE 1`
		res = await pool.queryPromise( sql )
		if( res.error ) return lib.return_fail( res.error, `nope`)

		return {
			success: true,
			results: res.results
		}

	case 'svgs':
		return {
			success: true,
			svgs: SVGS,
		}


	case 'restart':
		if( !env.RESTART.has ) return lib.return_fail('undefined restart', 'restart unavailable')
		res = await new Promise( ( resolve, reject) => {
			exec( env.RESTART.command, (error, stdout, stderr) => {
				// none of this will fire, but :)
			    if (error) {
			        console.error(`Error executing command: ${error}`);
			        return reject('err restarting');
			    }
			    console.log(`restart: stdout: ${stdout}`);
			    console.error(`restart: stderr: ${stderr}`);
			    resolve()
			});			
		})
		return { success: true } 




	default:
		return lib.return_fail('unknown admin action ' + action, 'unknown admin action')
	}

	return res

}







export default {
	action,
}


