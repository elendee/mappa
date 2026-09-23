
export default function( fore, data, back ){

	let response = ''
	let fg = ''
	let bg = ''

	switch( fore ){
		case 'black':  // transparent ?
			fg = '\x1b[30m'
			break;
		case 'red':
			fg = '\x1b[31m'
			break;
		case 'lgreen':
			fg = '\x1b[32m'
			break;
		case 'orange':
			fg = '\x1b[33m'
			break;
		case 'blue':
			fg = '\x1b[34m'
			break;
		case 'magenta':
			fg = '\x1b[35m'
			break;
		case 'lblue':
			fg = '\x1b[36m'
			break;
		case 'lgrey':
			fg = '\x1b[37m'
			break;
		case 'grey':
			fg = '\x1b[38m'
			break;
		default: break;
	}

	switch( back ){
		case 'red':
			bg = '\x1b[41m'
			break;
		case 'lgreen':
			bg = '\x1b[42m'
			break;
		case 'orange':
			bg = '\x1b[43m'
			break;
		case 'blue':
			bg = '\x1b[44m'
			break;
		case 'magenta':
			bg = '\x1b[45m'
			break;
		case 'lblue':
			bg = '\x1b[46m'
			break;
		case 'lgrey':
			bg = '\x1b[47m'
			break;
		case 'grey':
			bg = '\x1b[48m'
			break;
		default: break;
	}

	response = fg + bg

	if( response ) return response + data + '\x1b[0m' // ( clear )

	return data

}
