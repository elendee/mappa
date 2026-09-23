// native
import fs from 'fs'
import os from 'os'
import { spawn } from 'child_process'
import express from 'express'
import http from 'http'
import session from 'express-session'
// import FormData from 'express-form-data'
import cors from 'cors'
import redis from 'redis'
import { RedisStore } from 'connect-redis'
import multer from 'multer'
// import web_push from 'web-push'
const uploadDisk = multer({ 
	dest: env.APP_ROOT + '/fs/tmp/',
});
const uploadMemory = multer({ 
	dest: env.APP_ROOT + '/fs/tmp/',
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 10 * 1024,
	}
});

// env
import env from './server/.env.js'
import log from './server/log.js'
import lib from './server/lib.js'
import DB from './server/db.js'
import * as mail from './server/mail.js'
import compression from 'compression'
import { imageSizeFromFile } from 'image-size/fromFile'
import { Jimp } from 'jimp'


// NPM

// app layer
import initCron from './server/initCron.js'
import gatekeep from './server/middleware/gatekeep.js'
import update_edited from './server/middleware/update_edited.js'
import ensure_ids from './server/middleware/ensure_ids.js'
import ip_block from './server/middleware/ip_block.js'
import reroute_memory from './server/middleware/reroute_memory.js'
import render from './client/map_html.js'
import auth from './server/auth.js'
import MAIN from './server/OPS_main.js'
import ADMIN from './server/OPS_admin.js'
import ACCOUNT from './server/OPS_account.js'
import wss from './server/WSS.js'
import PUBLIC from './server/data/PUBLIC.js'
import FIELDS from './server/data/FIELDS.js'
// import BROKER from './server/BROKER.js'
import User from './server/models/User.js'
// import STORE_HANDLER from './server/STORE_HANDLER.js'
import session_manager from './server/session_manager.js'
import SOCKETS from './server/SOCKETS.js'
import SETTINGS from './server/SETTINGS.js'
import * as CRUD from './server/CRUD.js' // subs
import BROKER from './server/BROKER.js'
// import file_handler from './server/file_handler.js'
// import file_processors from './server/file_processors.js'
import PRIVATE from './server/data/PRIVATE.js'
import * as GET from './server/GET.js'
import * as ModelClasses from './server/models/ModelClasses.js'
// import NOTIFICATIONS from './server/NOTIFICATIONS.js'
import WORLD from './server/WORLD.js'






if( !env.APP_ROOT ) throw new Error('must define app-root')



const host = os.hostname()

// const redisClient = redis.createClient({ legacyMode: true })
const redisClient = redis.createClient({ 
	// legacyMode: true 
})

redisClient.on('error', err => log('error', 'Redis Client Error', err));


const WSS = wss()


let server



// init

;(async() => {


log( 'boot', `\x1b[33m
___________________________________________________
______________ ${ env.SITE_TITLE }
___________________________________________________
:: os hostname:${host}
:: app root:${ env.APP_ROOT }
:: site url:${ env.SITE_URL }
:: db host:${env.DB.HOST}
:: db name:${env.DB.NAME }
:: ${ new Date().toString() }
\x1b[0m`)


// get redis db key
let rmap
try{
	rmap = JSON.parse( await fs.readFileSync( env.REDIS.MAP_URI ) )
}catch( err ){
	log('flag', err )	
	return
}



const exp = new express()

if( !env.LOCAL ){
	exp.set('trust proxy', 1) // trust first proxy
}

server = http.createServer( exp )


const {
	STORE,
	redis_session,
} = await session_manager.init({
	exp,
})

exp.use( redis_session )

// exp.use( (req, res, next) => {
//     if(req.path.includes('/css') || req.path.includes('/js') || req.path.includes('/fs') || req.path.includes('/resource')) return next();
// 	log('sessions', 'SESS_DEBUG POST:', {
// 		sid: req.sessionID,
// 		user: req.session.USER ? req.session.USER.email : 'none'
// 	})
// 	next()
// })


if( env.LOCAL ){
	exp.use('/css', express.static( './client/css' )) // __dirname + 
	exp.use('/js', express.static( './client/js' )) // __dirname + 
	exp.use('/fs', express.static( './fs' ))
	exp.use('/inc', express.static( './inc' )) // __dirname + 
	exp.use('/resource', express.static( './resource' )) // __dirname + 
	exp.use('/node_modules/', express.static( './node_modules/' )) // __dirname + 
	// exp.use('/geometries', express.static( './geometries' )) // __dirname + 
}









exp.use( (req, res, next) => {
	if (req.originalUrl.startsWith('/stripe_webhook') ){
		next()
	} else {
		express.json()(req, res, next)
		// exp.use( bodyParser.json() )
	}
})

exp.use( ip_block )
exp.use( reroute_memory )
exp.use( gatekeep )
exp.use( update_edited )
exp.use( ensure_ids )

// const FormData_options = {
// 	uploadDir: os.tmpdir(),
// 	autoClean: true
// }
// exp.use( FormData.parse( FormData_options ) )
// exp.use( FormData.format() )









// routing

exp.get('/', async(request, response)  => {
	response.send( render('dashboard', request, {} ))
})


// shim cache it
let style_files = []
setTimeout(() => {
	fs.readdir( env.ROOT + '/node_modules/highlight.js/styles', ( err, files ) => {
		if( err ) log('flag', err )
		for( const f of files || [] ){
			style_files.push( f )
		}
		log('boot', 'initialized style files: ' + style_files?.length )
	})
}, 1000 )


// node_modules/highlight.js
for( const page of PRIVATE.pages ){

	exp.get( [ '/' + page ], async(request, response) => {

		// Object.keys( custom_preprocessors ).includes( page )
		if( 0 ){

			// try{
			// 	const data = await custom_preprocessors[ page ]( request )
			// 	response.send( render( page, request, data ) )
			// }catch(err){
			// 	log('flag', 'custom data err')
			// 	response.send( render( 'error', request, 'there was an error filling custom data for the page' ) )
			// }

		}else{

			response.send( render( page, request ) )

		}

	})

}


// legacy auth pages now live in a modal — bounce old bookmarks to dashboard
exp.get( [ '/login', '/register' ], async(request, response) => {
	response.send( render('redirect', request, '' ))
})

exp.get('/await_confirm', ( request, response ) => {
	if( lib.is_logged( request )){
		response.send( render('redirect', request, 'account' ))
	}else{
		response.send( render('await_confirm', request ))
	}
})

exp.get('/alcove/:uuid', async( request, response ) => {
	response.send( render('alcove', request, {} ) )
})

exp.get('/user/:uuid', async( request, response ) => {
	if( lib.is_logged(request) ){
		const user = await User.get_instance({
			column: 'uuid',
			value: request.params.uuid,
		})
		if( !user ) return response.send( render('404', request, 'user not found'))
		response.send( render('user', request, {
			user: user.publish( user.get_request_allowed( request ) ),
		} ) )
	}else{
		response.send( render('error', request, 'must be logged' ) )
	}
})

exp.get('/confirm_code/:code', function( request, response ){

	auth.confirm_code( request )
		.then( res => {
			if( res.success ){
				response.send( render('redirect', request, ''))
			}else{
				const msg = res?.msg || 'there was an error confirming'
				response.send( render('error', request, msg + ' - you can try <a href="/await_confirm?new=false">sending a new code</a>'))
			}
		})
		.catch( err => {
			log('flag', 'error confirm_account: ', err )
			response.send( render('error', request, 'error confirming account'))
		})
})


exp.get('/logout', ( request, response ) => {
	request.session.destroy()
	response.send( render('redirect', request, '' ))
})

exp.get('/robots.txt', (request, response) => {
	response.sendFile('/robots.txt', {root: './'}); log('routing', 'bot')
})

exp.get('/_storage/mysqldumps:slug', (request, response) => {
	// 
	if( !lib.is_admin( request )){
		return response.send( render('redirect', request, ''))
	}

	try{
		if( fs.existsSync( env.ROOT + request.path ) ){
			response.sendFile( request.path, { root: __dirname } )
		}else{
			log('flag', 'failed to find: ', env.ROOT + request.path )
			return response.send( render('redirect', request, '404') )
		}
	}catch( e ){
		log('flag', e )
		return response.send( render('redirect', request, '404'))
	}
})




// ^^ GET
// -------
// vv POST

exp.post('/login', (request, response) => {
	auth.login_user(request)
		.then(function(res){
			response.json(res)
		})
		.catch(function(err){
			log('flag', 'error logging in: ', err )
			response.json({
				success: false,
				msg: 'error logging in'
			})
		})
})

exp.post('/register', function( request, response ){
	auth.register_user( request )
		.then( function( res ){
			response.json( res )
		})
		.catch(function(err){
			log('flag', 'error registering', err )
			response.json({
				success: false,
				msg: 'error registering'
			})
		})
})

exp.post('/send_confirm', function( request, response ){
	auth.send_confirm({
		request,
		force_email: false,
		caller: 'post'
	})
	.then(function( res ){
		response.json( res )
	})
	.catch(function( err ){
		log('flag', 'error send_confirm: ', err )
		response.json({
			success: false,
			msg: err.msg || 'error sending confirm',
		})
	})
})


exp.post('/action_main', compression(), ( request, response ) => {

	MAIN.action( request )
	.then( res => {
		response.json( res )
	})
	.catch( err => {
		log('flag', 'action err', err )
		response.json({
			success: false,
			msg: err.msg || 'request error'
		})
	})
})

exp.post('/action_admin', function( request, response ){
	ADMIN.action( request, response )
	.then(function( res ){
		if( res?.handles_self ){
			//
		}else{
			response.json( res )
		}
	})
	.catch(function( err ){
		log('flag', 'error admin action: ', err )
		response.json({
			success: false,
			msg: 'error admin action',
		})
	})
})


exp.post('/action_account', function( request, response ){
	ACCOUNT.action( request )
	.then(function( res ){
		response.json( res )
	})
	.catch(function( err ){
		log('flag', 'error account action: ', err )
		response.json({
			success: false,
			msg: 'error account action',
		})
	})
})


exp.use((req, res) => {                                                                                                                                                                                    
  if (req.path.match(/\..*/) || req.path.match(/^\/resource/)) return res.status(404).end()                                                                                                                
  res.status(404).send(render('404', req))                                                                                                                                                                 
}) 








const done = await ModelClasses.init()


DB.initPool( async( err, pool ) => {

	if( err ) return console.error( 'no db: ', err )
	
	await new Promise((resolve, reject) => {
		server.listen( env.PORT, function() {
			resolve()
		})
	})

	await SETTINGS.init()

	setTimeout(async() => {
		// if( env.LOCAL ) return lib.return_fail( 'env.LOCAL skipping cron', false )
		// await SETTINGS.init()
		initCron()
	}, 1000 )

	// await initVAPID()

	// start websockets
	if( PRIVATE.INIT.BOOT_SOCKETS ){
		
		server.on('upgrade', function( request, socket, head ){

			log('wss', 'socket upgrade', {
				user_id: request.session?.USER?.id 
			})

			redis_session( request, {}, () => {
				// log('wss', 'redis session parsed')
				WSS.handleUpgrade( request, socket, head, function( ws ) {
					WSS.emit('connection', ws, request )
				}, 'INDEX.JS ' + socket.id )
			})

		})
	}

	WSS.on('connection', async( socket, req ) => {

		socket.request = req

		log('wss', 'user instantiate pre: ', {
			user: lib.identify( req.session.USER ) 
		})

		if( !socket.request.session.USER ) socket.request.session.USER = new User()

		log('wss', 'user instantiate post: ', {
			user: lib.identify( socket.request.session.USER ) 
		})

		socket.isAlive = socket.isAlive || true

		if( WSS.clients.size > env.MAX_CONCUR_USERS ) {
			return return_fail_socket({
				socket, 
				msg: 'sorry, game is at capacity'
			})
		}

		if( !WORLD._online ){
			await WORLD.bring_online()
		}

		// start game..
		WORLD.init_user({
			socket,
		})
		.catch( err => {
			log('flag', 'err init user ', err )
			socket.send( JSON.stringify({
				type: 'hal',
				msg_type: 'error',
				msg: 'error initializing user',
			}))
		})

	})


})





})(); // init





