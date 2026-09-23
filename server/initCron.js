import env from './.env.js'
import log from './log.js'
import lib from './lib.js'
import DB from './db.js'
import MAIN  from './OPS_main.js'
import SETTINGS from './SETTINGS.js'
import PUBLIC from './data/PUBLIC.js'
import BROKER from './BROKER.js'
import alert_err from './alert_err.js'















const do_cron = period => {
	/*
		do cron
		save in mem
		save in db
	*/

	switch( period ){

	case 'daily':
	case 'hourly':
	case 'minute':
	case 'sec_10':
	case 'sec_1':
		BROKER.publish('DO_CRON', {
			period,
		})
		break;

	default:
		return log('flag', 'unknown cron period', period )
	}

	LAST_CRONS[period].ran = Date.now()

	SETTINGS.set('last_cron_' + period, LAST_CRONS[period].ran )

	// log('cron', `fired ${period}` )

} // do cron







const LAST_CRONS = {
	daily: {
		ran: false,
		unit: lib.times.day,
	},
	hourly: {
		ran: false,
		unit: lib.times.hour,
	},
	minute: {
		ran: false,
		unit: lib.times.minute,
	},
	sec_10: {
		ran: false,
		unit: lib.times.second * 10,
	},
}
if( env.LOCAL ){
	LAST_CRONS.sec_1 = {
		ran: false,
		unit: lib.times.second,
	}
}

const init_cron_last_ticks = async() => {

	const pool = DB.getPool()
	let sql, res

	for( const period in LAST_CRONS ){


		// settings is already initialized:
		if( typeof LAST_CRONS[period].ran === 'number'){
			continue // all set
		}

		log('flag', 'init last cron', period )


		// initialize setting:
		const setting_name = `last_cron_${period}`

		sql = `SELECT * FROM settings WHERE setting=?`
		res = await pool.queryPromise( sql, setting_name )
		if( res.error ){

			clearInterval( THE_CRON )

			return alert_err({
				msg: `ERROR READING CRON - ENDING CRON`,
				err: res.error,
				setting_name
			}, `Cron encountered error and stopped in ${env.SITE_TITLE}` )

		}

		const num = Number( res?.results?.[0]?.value )

		if( typeof num !== 'number' || isNaN( num ) ){

			log('flag', `invalid or missing last_cron; setting to 0:`, {
				setting_name,
				period,
				last_tick: LAST_CRONS[period].ran,
			})

			LAST_CRONS[period].ran = 0

		}else{

			LAST_CRONS[period].ran = num

		}


	}

} // init cron last ticks




const cron_tick = async( caller ) => {

	// log('flag', 'tickin')

	// ensure last tick
	await init_cron_last_ticks()

	for( const period in LAST_CRONS ){
		if( typeof LAST_CRONS[period].ran !== 'number'){
			throw new Error('LAST_CRONS should never be invalid at exec time ' + LAST_CRONS[period].ran )
		}
		const elapsed = Date.now() - LAST_CRONS[period].ran
		if( elapsed > LAST_CRONS[period].unit ){
			do_cron( period )
		}
	}

}



const end_cron = event => {
	const {
		caller,
	} = event

	alert_err({
		msg: 'ending cron',
		caller,
	}, 'ended ' + env.SITE_TITLE + ' cron - ' + caller )

	clearInterval( THE_CRON )

}




// init


let initialized = false

let THE_CRON

const init = () => {

	if( initialized ) return log('flag', 'duplicate init-cron....');
	initialized = true

	cron_tick('init')
	.catch( err => {
		log('flag', 'err cron init', err )
	})

	THE_CRON = setInterval(() => {
		cron_tick('check-elapsed')
		.catch( err => {
			log('flag', 'err cron tick', err )
		})
	}, lib.times.second )

}



BROKER.subscribe('END_CRON', end_cron )




export default init