import env from './.env.js'
import fs from 'fs'
import { createClient } from 'redis'
import { RedisStore } from 'connect-redis'
import session from 'express-session'
const redisClient = createClient({ 
	legacyMode: false,
})
import log from './log.js'
import lib from './lib.js'
import BROKER from './BROKER.js'





let STORE




const res = await redisClient.connect()

let rmap
try{
	rmap = JSON.parse( fs.readFileSync( env.REDIS.MAP_URI ) )
}catch( err ){
	throw new Error( err )	
}




let map_index 
if( env.PRODUCTION ){
	map_index = rmap.okomap
}else if( env.DEV ){
	map_index = rmap.dev
}else if( env.LOCAL ){
	map_index = rmap.okomap
}else{
	throw new Error('invalid env redis map')
}




// connect to correct redis db key
await new Promise(( resolve, reject ) => {
	redisClient.select( map_index )
	// , ( err, res ) => {
	// 	if( err ){
	// 		reject( err )
	// 		return
	// 	}
	resolve()
	// })
})





// --- subscribers

const update_field = event => {

	const { field, value, email } = event

	if( !email ) return log('flag', 'email missing to update session: ', field, value )

	// could move this to session-manager eventually...
	STORE.all(( err, sessions ) => {
		if( err ) return log('flag', 'err updating session', {
			err,
		})

		for( const session of sessions ){
			if( session.USER?.email === email ){
				session.USER[ field ] = value
				STORE.set( session.id, session, err => {
	                if (err) {
	                    log('flag', 'Error updating session:', err );
	                } else {
	                    // console.log('Session updated successfully');
	                    log('sessions', 'updated session', {
	                    	field,
	                    	value,
	                    	email: email.substr(0,6)
	                    })
	                }
	            });
				return;
			}
		}

	})

}







/*
	used when admins confirm accounts
*/
const flush_session = async( event ) => {
	const {
		// either:
		email,
		// or:
		request,
		response,
	} = event || {}

	try{

		const _email = email || request.body.email_match

		if( !_email ) throw new Error('no email to clear')

		log('sessions', 'attempt flush: ', _email )

		// have this one: sess:eUjZHhUzfziRdoATIklsk3lxRjNaeOi6: dev@oko.nyc
		const sessionIds = await redisClient.sMembers(`user_sessions:${_email}`)

		if( sessionIds.length === 0 ){
			log('flag', `ℹ️ No sessions found for ${_email}`)
			return response.json({
				success: false,
				count: 0,
				msg: 'no sessions found',
			})
		}

		const pipeline = redisClient.multi()
		sessionIds.forEach(id => {
			pipeline.del(`sess:${id}`)
			pipeline.sRem(`user_sessions:${_email}`, id)
		})

		await pipeline.exec()
		await redisClient.del(`user_sessions:${_email}`)  // Cleanup

		log('sessions', `✅ Flushed ${sessionIds.length} sessions for ${_email}`)

		return response.json({
			success: true,
			count: sessionIds.length
		})

	}catch( err ){
		log('flag', 'err flush session', err )
		if( response ) response.json({
			success: false,
			msg: 'err flush session',
		})
	}

} // flush session





const flush_all_sessions = async ( event ) => {
	const {
		request,
		response,
	} = event || {}

	try{

		let totalDeleted = 0
		let cursor = '0'

		log('flag', '🔄 Starting full session flush...')

		do {

			const scanResult = await redisClient.scan( cursor, {
				MATCH: 'sess:*',
				COUNT: 1000,  // Higher batch for speed
				// TYPE: 'string'
			})

			const nextCursor = scanResult.cursor
			const keys = scanResult.keys

			if( keys.length === 0 ) continue

			// Bulk destroy (Pipelined for perf)
			const pipeline = redisClient.multi()
			for (const key of keys) {
				pipeline.del(key)
			}
			await pipeline.exec()

			totalDeleted += keys.length
			log(`🗑️ Flushed batch: ${keys.length} sessions (total: ${totalDeleted})`)

			cursor = nextCursor

		} while (cursor !== '0')

		log('sessions', `✅ Flush complete: ${totalDeleted} sessions deleted`)

		return response.json({
			success: true,
			count: totalDeleted,
		})

	}catch( err ){
		log('flag', 'err flush session', err )
		if( response ) response.json({
			success: false,
			msg: 'err flush'
		})
	}

} // flush all




const sessionCount = async () => {
	try{

		const total = await new Promise((resolve) => {
			STORE.ids((err, ids) => {
				if (err) return log('redis id err', err)
				const total = ids.length  // Your count!
				resolve( total )
			})			
		})

		return total

	}catch( err ){
		log('flag', err )
	}

} // session count









const list_sessions = async( event ) => {
	try{

		const {
			email,           // Optional: filter by USER.email
			limit = 99999,      // Optional: max sessions to check
			// cursor = '0',
		} = event || {}

		const allKeys = []
		let matchingSessions = []

		// log('flag', 'list-sessions', {
		// 	cursor,
		// 	_cursor,
		// })

		log('sessions', `🔍 Scanning ${limit} sessions for ${email||'(all)'}...`)

		// Full SCAN if no email filter (paginated)
		let _cursor = '0'
		do {
			const scanResult = await redisClient.scan( _cursor, {
				MATCH: 'sess:*', 
				COUNT: 100
			})
			_cursor = scanResult.cursor
			allKeys.push( ...scanResult.keys )
		} while ( _cursor !== '0' );

		log('sessions', `📋 Found ${allKeys.length} total sessions starting at cursor: ${_cursor}`)

		// Parse & filter (limit for perf)
		const toCheck = limit ? allKeys.slice(0, limit) : allKeys
		for( const key of toCheck ){
			try {
				const data = await redisClient.get( key )
				if( !data ) continue

				const session = JSON.parse(data)
				const sessEmail = session?.USER?.email

				// log('sessions', `${key}: ${sessEmail || 'no USER.email'}`)

				// Exact match or list all
				if( !email || sessEmail === email ){
					matchingSessions.push({
						key,
						email: sessEmail,
						data: session  // Full session object
					})
				}
			} catch (err) {
				log('flag', `Parse error ${key}:`, err.message )
			}
		}

		if( email ){
			log('sessions', `✅ Matching "${email}": ${matchingSessions.length} sessions`)
		} else {
			log('sessions', `📊 Sampled ${toCheck.length}/${allKeys.length} sessions`)
		}



		return {
			total: allKeys.length,
			checked: toCheck.length,
			matching: matchingSessions,
			sample: matchingSessions.slice(0, 5),  // First 5 for brevity
			// cursor,
		}

	}catch( err ){
		log('flag', 'err list', err )
	}

} // list sessions



const init = async() => {

	STORE = new RedisStore({ 
		host: env.REDIS.HOST, 
		port: env.REDIS.PORT, 
		client: redisClient, 
		ttl: env.REDIS.TTL,
	})

	log('boot', 'redis connected (' + env.REDIS.NAME + ':' + map_index + ')' )

	const redis_session = session({
		secret: env.REDIS.SECRET,        // long, random, in env
		name:   env.REDIS.NAME,          // non-default, e.g. 'sid'
		store:  STORE,

		rolling: true,
		resave: false,
		saveUninitialized: false,        // do not save empty sessions [web:15]

		cookie: { 
			maxAge: lib.times.week,
			httpOnly: true,                // JS cannot read session cookie [web:15][web:18]
			sameSite: 'lax',               // good CSRF default for same-site app [web:16][web:18]
			secure: !env.LOCAL, // HTTPS-only in prod [web:15][web:16]
		}
	})

	// sessionCount()
	// .then( total => {
	// 	log('flag', 'SESSION TOTALS', total )
	// })

	return {
		STORE,
		redis_session,
	}

} // init



const track_session = event => {
	const {
		email,
		session_id,
	} = event

	redisClient.sAdd(`user_sessions:${email}`, session_id )

	log('sessions', 'tracking: ', {
		email,
		session_id,
	})

}


const view_sessions = async( event ) => {
	try{

		const {
			request,
			response,
		} = event

		const res = await list_sessions({
			// email: 
			cursor: request.body.cursor || '0',
		})

		const logged_sessions = []
		let anon_sessions = 0

		for( const session of res.matching || []){
			if( session.data?.USER?.id ){
				logged_sessions.push( session )
			}else{
				anon_sessions++
			}
		}

		response.json({
			success: true,
			// res,
			logged_sessions,
			anon_sessions,
		})

	}catch( err ){
		log('flag', 'err view-sessions', err )
	}

}

const sweep_empty = async( event ) => {
	const {
		period,
	} = event

	if( period !== 'hourly' && period !== 'sec_10' ){
		return;
	}

	// log('sessions', 'start session sweep')

	let cursor = '0', deleted = 0;
	do {
		const result = await redisClient.scan( cursor, { 
			MATCH: 'sess:*', 
			COUNT: 100 
		});
		// cursor = parseInt( result.cursor );
		cursor = result.cursor
		for( const key of result.keys ){
			const data = await redisClient.get( key );
			if( data ){
				const session = JSON.parse( data );
				if( !session.USER ){ // only delete if NO 'user' prop
					await redisClient.del( key );
					deleted++;
					log('sessions', `Deleted empty ${key}`);
				}
			}
		}
	} while (cursor !== '0');

	// log('sessions', 'finished session sweep')

}




if( env.LOCAL || env.DEV  ){
	setTimeout(() => {
		BROKER.publish('SESSION_LIST', {})
	}, 2000 )
}




BROKER.subscribe('SESSION_LIST', list_sessions )
BROKER.subscribe('SESSION_FLUSH', flush_session )
BROKER.subscribe('SESSION_TRACK', track_session )
BROKER.subscribe('SESSION_FLUSH_ALL', flush_all_sessions )
BROKER.subscribe('SESSION_UPDATE_FIELD', update_field )
BROKER.subscribe('SESSION_SEND_RESPONSE', view_sessions )
BROKER.subscribe('DO_CRON', sweep_empty )



export default {
	init,
}