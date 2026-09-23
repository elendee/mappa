import env from './.env.js'







const active = env.ACTIVE

const timestamp = true
let d 
let dstring = ''


const log = function( type, msg, ...data ){

	if( msg && msg === 'SKIPLOG') return false
	
	if( timestamp ) {
		d = new Date()
		dstring = `[${ d.toLocaleString().split(',')[1] } ]`
	}

	data = data || ''
	let c = 0
	if( active[ type ] ){
		let color = ''
		let pre = ''
		for( const t in active ) {
			c++
			if( t == type ){
				color = colors_fg[ c % colors_fg.length ]
			}
		}
		if( type == 'flag' ) pre = '!!! '
		if( type === 'inspector' ){
			if( !env.LOCAL ) return false
		}
			
		// 	if( !env.LOCAL ){
		// 		return false;
		// 	}
		// 	const d1 = typeof msg === 'string' ? msg.substr(0, 20) + '...' : '[object]'
		// 	const d2 = []
		// 	for( let i = 0; i < data.length; i++ ){
		// 		if( typeof data[i] === 'string' ){
		// 			d2[i] = data[i].substr(0, 20) + '...'
		// 		}else{
		// 			d2[i] = '[object]'
		// 		}
		// 	}
		// 	console.log('\x1b[100m\x1b[30mlog\x1b[0m@' + color + type + '\x1b[0m' + ': ' + pre + dstring, d1, ...d2 )
		// }else{

		console.log('\x1b[100m\x1b[30mlog\x1b[0m@' + color + type + '\x1b[0m' + ': ' + pre + dstring, msg, ...data )

		// }
	}

}

log.flag = ( msg, data )=> {
	log('flag', msg, data || '' )
}






var colors_fg = [
// "\x1b[0m", RESET
	'\x1b[1m',
	'\x1b[2m',
	// "\x1b[4m", UNDERSCORE
	// "\x1b[5m", BLINK
	// "\x1b[7m", REVERSE
	// "\x1b[8m", HIDDEN
	// "\x1b[30m", BLACK FG
	'\x1b[31m',
	'\x1b[32m',
	'\x1b[33m',
	'\x1b[34m',
	'\x1b[35m',
	'\x1b[36m',
	'\x1b[37m'
]


var colors_bg = [
	'\x1b[40m',
	// "\x1b[41m", RED bg
	'\x1b[42m',
	'\x1b[43m',
	'\x1b[44m',
	'\x1b[45m',
	'\x1b[46m',
	// "\x1b[47m", LIGHT GREY BG
	'\x1b[100m',
	'\x1b[101m',
	'\x1b[102m',
	'\x1b[103m',
	'\x1b[104m',
	'\x1b[105m',
	'\x1b[106m',
	// "\x1b[107m" WHITE BG
]


log( 'call', 'log.js' )





export default log
