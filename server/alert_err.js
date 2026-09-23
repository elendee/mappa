import env from './.env.js'
import log from './log.js'
import lib from './lib.js'
import { sendmail } from './mail.js'





const alert_err = async( log_err, send_msg ) => {

	try{

		const hash = lib.random_hex( 8 )

		log('flag', {
			hash,
			send_msg,
		})
		log('flag', 'alert-err', log_err )

		if( !env.PRODUCTION ) return log('flag', 'non-production mail skip' )
		if( !env.DEV_EMAIL ) return log('flag', 'missing dev email for alert' )

		if( typeof log_err === 'string' ){
			// 
		}else{
			log_err = JSON.stringify( log_err, false, 2 )
		}

		const mailPacket = {
			to: env.DEV_EMAIL,
			from: env.MAIL.ADMIN,
			subject: `${env.SITE_TITLE} alert err ${hash}`,
			html: send_msg,
			text: send_msg,
		}

		sendmail( mailPacket, true, true )
		.catch( err => {
			log('flag', `err sending ${env.SITE_TITLE} dev alert`, err )
		})

	}catch( err ){
		log('flag', 'err -alert-err- ', err )
	}

}


export default alert_err