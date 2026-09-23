import log from './log.js'
import lib from './lib.js'
import env from './.env.js'
import formData from 'form-data';


import nodemailer from 'nodemailer'
// import mailgun from "mailgun-js"
// import mailgun from 'mailgun.js'






// const SENDTYPE = 'MG_PUBLIC'
const SENDTYPE = 'NODEMAILER'

let _send, mg







if( !env.PRODUCTION ){

	_send = async( data ) => {

		log('mail', 'non production mail halt: ', data )
		return { success: true, halted: true }

	}



}else if( SENDTYPE === 'MG_PUBLIC' ){

	throw new Error('disallwed mailgun')

	/* ----------------------------------- MAILGUN PUBLIC DOCS ----------------------------------- */

	mg = new mailgun( formData )

	const client = mg.client({
		username: 'api', 
		key: env.MAILGUN.KEY,
		public_key: env.MAILGUN.PUB_KEY,
	});

	_send = async( data ) => {

		if( data.html && !data.text ){
			data.text = lib.user_data( data.html, {
				new_lines: true,
				strip_html: true,
			})
		}

		const res = await client.messages.create( env.MAILGUN.DOMAIN, data )
		return res
	}








}else if( SENDTYPE === 'NODEMAILER' ){


	/* ----------------------------------- NODEMAILER ----------------------------------- */

	const transporter = nodemailer.createTransport({
		// host: 'mail.oko.nyc',
		host: env.MAIL.SERVER,
		service: env.MAIL.PROTOCOL,
		port: env.MAIL.PORT,
		secure: env.MAIL.SECURE,
		requireTLS: true,
		tls: {
			rejectUnauthorized: false
		},
		auth: {
			user: env.MAIL.ADMIN,
			pass: env.MAIL.PW
		}
	})

	_send = ( options ) => {

		if( options.html && !options.text ){
			options.text = lib.user_data( options.html, {
				new_lines: true,
				strip_html: true,
			})
		}

		return new Promise((resolve, reject) => {

			/////////////////////////// dev 
			if( !env.PRODUCTION ){ 										
				log('mail', 'email SKIPPED (dev)', options )
				resolve({
					response: 'sent',
					accepted: [1],
				})
				return true
			}
			
			transporter.sendMail( options, (error, info) => { 	
				if( error ){
					reject( error )
					return false
				}

				if( env.PRODUCTION ){ /////////////////////////// PRODUCTION, more concise
					log('mail', 'email SENT: ', {
						from: options.from,
						to: options.to,
						subject: options.subject,
						html: '( ' + options.html.length + ' characters )',
						text: '( ' + options.text.length + ' characters )' 
					})

				}else{ /////////////////////////// DEV, LOCAL, full log

					log('mail', 'email SENT: ', options )

				}

				resolve( info )

			})

		})

	}

}


const catch_send = async( data ) => {
	try{
		const res = await _send( data )
		// log('mail', 'catch_send OK: ', {
		// 	to: data.to,
		// 	from: data.from,
		// 	subject: data.subject,
		// 	info: res,
		// })
		return {
			success: true,
			info: res,
		}
	}
	catch( err ){
		// log('flag', 'mail SEND FAILED ─────────────────────────' )
		// log('flag', 'mail failed: ', { to: data.to, from: data.from, subject: data.subject, html_len: data.html?.length, text_len: data.text?.length } )
		// log('flag', 'mail err message: ', err?.message || String(err) )
		// log('flag', 'mail err details: ', { code: err?.code, responseCode: err?.responseCode, command: err?.command, response: err?.response } )
		if( err?.stack ) log('flag', 'mail err stack: ', err.stack )
		try{ log('flag', 'mail err full: ', JSON.stringify(err, Object.getOwnPropertyNames(err), 2) ) } catch(e){ log('flag', 'mail err full (raw): ', err ) }
		return {
			success: false,
			msg: 'failed to send mail',
			error: err?.message || String(err),
		}
	}
}


const client = mg
const sendmail = catch_send

export {
	client,
	sendmail,
}
