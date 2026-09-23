import log from './log.js'



const to_raw_ISO = iso => { // handles either Date or ISOString

	if( iso.toISOString )  iso = iso.toISOString()

	if( typeof iso !=='string' ){
		log('flag', 'invalid raw iso requested: ', iso )
		return iso
	}

	if( iso.indexOf('T') === -1 || iso.indexOf('Z') === -1 ){ // ISOString
		log('flag', 'invalid ISO: ', iso )
		iso = new Date().toISOString()
	}

	iso = iso.slice(0, 19).replace('T', ' ')

	return iso

}

// const ISO_raw_to_full = raw => {

// 	if( typeof raw !=='string' || raw.indexOf('Z') > -1 || raw.indexOf('T') > -1 ){
// 		log('flag', 'invalid raw ISO : ', raw )
// 		return new Date().toISOString()
// 	}

// 	return raw.replace(' ', 'T') + 'Z'

// }


const add = ( units, amount, date ) => {
	// just pass negative amount for subtraction

	if( !date.getTime ){ 
		log('flag', 'invalid date add', date)
		return false
	}

	let stamp = date.getTime()

	switch( units ){
		case 'second':
			stamp += ( amount * 1000 )
			break;
		case 'minute':
			stamp += ( amount * 1000 * 60 )
			break;
		case 'hour':
			stamp += ( amount * 1000 * 60 * 60 )
			break;
		case 'day':
			stamp += ( amount * 1000 * 60 * 60 * 24 )
			break;
		case 'week':
			stamp += ( amount * 1000 * 60 * 60 * 24 * 7 )
			break;
		case 'year': // ( 52 is imprecise )
			stamp += ( amount * 1000 * 60 * 60 * 24 * 7 * 52 )
			break;
		default:
			log('flag', 'invalid units for add: ', units )
			return date
	}		

	return new Date( stamp )//.toISOString()

}


// const ISO_diff = ( units, from_iso, to_iso ) => {

// 	if( !ISO_is_full( from_iso ) || !ISO_is_full( to_iso ) ){
// 		log('flag', 'invalid iso for add: ', from_iso, to_iso )
// 		return false
// 	}

// 	let diff
// 	let from_stamp = new Date( from_iso ).getTime()
// 	let to_stamp = new Date( to_iso ).getTime()

// 	switch( units ){
// 		case 'second':
// 			diff = to_stamp - from_stamp
// 			stamp += ( amount * 1000 )
// 			break;
// 		case 'minute'

// 			stamp += ( amount * 1000 * 60 )
// 			break;
// 		case 'hour'
// 			stamp += ( amount * 1000 * 60 * 60 )
// 			break;
// 		case 'day':
// 			stamp += ( amount * 1000 * 60 * 60 * 24 )
// 			break;
// 		case 'week':
// 			stamp += ( amount * 1000 * 60 * 60 * 24 * 7 )
// 			break;
// 		case 'year': // ( 52 is imprecise )
// 			stamp += ( amount * 1000 * 60 * 60 * 24 * 7 * 52 )
// 			break;
// 		default:
// 			log('flag', 'invalid units for diff: ', units )
// 			return false
// 	}	

// }


const ISO_is_full = iso => { 

	return typeof iso === 'string' && iso.indexOf('Z') > -1 && iso.indexOf('T') > -1

}

export default {
	add,
	ISO_is_full,
	to_raw_ISO,
}