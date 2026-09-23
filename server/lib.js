import env from './.env.js'
import log from './log.js'
import fs from 'fs'
import { pipeline } from 'stream';
import validator from 'email-validator'
import p_validator from 'password-validator'
import DATA_PRIVATE from './data/PRIVATE.js'
import DATA_PUBLIC from './data/PUBLIC.js'
import PUBLIC from './data/PUBLIC.js'
import sanitize_html from 'sanitize-html'

const schema = new p_validator()
const name_schema = new p_validator()



log('call', 'lib.js')

 
// Add properties to it
schema
	.is().min(6)                                    // Minimum length 8
	.is().max(30)                                   // Maximum length 100
	// .has().uppercase()                           // Must have uppercase letters
	// .has().lowercase()                           // Must have lowercase letters
	// .has().digits()                              // Must have digits
	.has().not().spaces()                           // Should not have spaces
	.is().not().oneOf(['password', 'Passw0rd', 'Password123'])


name_schema
	.is().min(3)
	.is().max(25)
	.has().not().spaces()
	.has().not().digits()



const static_chars = ['≢', '≒', '≓', '≎', '∿', '⦕', '⦖', '⦚', '⨌']


const get_public = () => {

	const r = {}

	Object.keys( this ).forEach( key => {
		if( !key.match(/^_/) && key != 'get_public' ){
			r[key] = this[key]
		}
	})

	return r

}

const check_collision = ( vector1, vector2, radius1, radius2, distance ) => {

	const dist = vector1.distanceTo( vector2 )
	if( dist < radius1 + radius2 + distance ){
		return true
	}
	return false

}

const iso_to_ms = ( iso ) => {

	let isoTest = new RegExp( /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/ )

    if( isoTest.test( str ) ){
    	return new Date( iso ).getTime()
    }
    return false 

}

const ms_to_iso = ( ms ) => {

	if( typeof( ms ) !=  'number' )  return false

	return new Date( ms ).toISOString()

}

const random_hex = ( len ) => {

	//	let r = '#' + Math.floor( Math.random() * 16777215 ).toString(16)
	let s = ''
	
	for( let i = 0; i < len; i++){
		
		s += Math.floor( Math.random() * 16 ).toString( 16 )

	}
	
	return s

}

const random_int = ( start, range ) => {

	return start + Math.floor( Math.random() * range )

}

const random_offset = ( center, range ) => {

	return center + ( Math.floor( Math.random() * range ) - ( range / 2 ) )

}

const is_num = value => {
	const coercedValue = Number(value);
	return typeof coercedValue === 'number' && !isNaN(coercedValue) && !isNaN(parseFloat(value));
};


const is_valid_id = ( test ) => {
	return ( typeof( test ) === 'number' && test > 0 )
}

const is_valid_email  = ( email, is_basic ) => {

	// generic email checking
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const is_formatted = emailRegex.test( email );

	if( !is_formatted ) return false;

	if( is_basic ) return true; // dont test schema if only basic and already passed...

	// specific schema checking
	return validator.validate( email )

}


const is_valid_password = ( password ) => {

	if( password.match(/^null$/i) ){
		log('flag', 'cant use null as pw')
		return false
	}

	return schema.validate( password + '' )

}






const sanitize_packet =( packet ) => {

	return packet

}


const jarble_chat =( chat ) => {

	log('flag', 'jarbling: ', chat )

	const r = []
	for( const key of chat ) {
	    if( Math.random() > .5 ){
	        r.push( static_chars[ Math.floor( Math.random() * static_chars.length ) ])
	    }else{
	        r.push( key )
	    }
	}
	chat = ''
	r.forEach( i => {
	    chat += i
	})

	log('flag', 'returned: ', chat )

	return chat
}








const is_valid_name = ( name ) => {

	let valid = true

	if( !name ) valid = false

	if( typeof( name ) !== 'string' || name.length > DATA_PRIVATE.name_length ) return false // yes skip the log here, could be huge

	if( name.match(/^null$/i) ) valid = false

	if( !name_schema.validate( name + '' ) ) valid = false

	if ( !/^([a-zA-Z]|\'|-)*$/g.test( name ) ) valid = false

	if( !valid ) {
		log('flag', 'name regex failed: ', name )
		return false
	}

	return true

}


const validate_boolean = ( ...vals ) => {
	for( const val of vals ){
		if( Boolean( val ) ) return true
	}
	return false
	// vals[ vals.length - 1 ]
}


function validate_number( ...vals ){

	for( const num of vals ){
		if( typeof num === 'number' || ( ( num && typeof Number( num ) === 'number' ) && !isNaN( Number( num ) ) ) ) return Number( num )
	}
	return vals[ vals.length - 1 ]

}



function validate_date( ...vals ){

	let test
	for( const val of vals ){
		test = new Date( val )
		if( !test.toString().match(/invalid/i) ) return new Date( val )
	}
	return vals[ vals.length - 1 ]

}



function validate_string( ...vals ){

	for( const str of vals ){
		if( typeof( str ) === 'string' ) return str
	}
	return vals[ vals.length - 1 ]

}


function merge_results_to_object( existing_obj, incoming_arr, hydrateClass ){
	const valid_keys = []
	let found
	for( const item of incoming_arr ){
		found = false
		for( const key of Object.keys( existing_obj )){
			if( existing_obj[ key ].id === item.id ){
				found = key
				valid_keys.push( key )
			}
		}
		if( !found ){
			let new_object = new hydrateClass( item )
			existing_obj[ new_object.uuid ] = new_object
			valid_keys.push( new_object.uuid )
		}
	}
	for( const key of Object.keys( existing_obj )){
		if( !valid_keys.includes( key )) delete existing_obj[ key ]
	}
}

const random_entry = source => {

	if( Array.isArray( source )){
		return source[ random_range( 0, source.length - 1, true ) ]
	}else if( source && typeof source === 'object'){
		return source[ random_entry( Object.keys( source ) ) ]
	}
	return ''
}



const random_range = ( low, high, int ) => {

	if( low >= high ) return low

	return int ? Math.floor( low + ( Math.random() * ( high - low ) ) ) : low + ( Math.random() * ( high - low ) )

}


const bad_packet = socket => {

	socket.bad_packets = socket.bad_packets || 0
	socket.bad_packets++

	if( socket.bad_packets > 100 ) return true

	if( socket.bad_packet_cooling )	clearTimeout( socket.bad_packet_cooling )
	
	socket.bad_packet_cooling = setTimeout(()=>{
		socket.bad_packet_cooling = false
		socket.bad_packets = 0
	}, 1000)
	
	return false
	
}

const identify = entity => {
	if( !entity ) return false
	let response = ''
	if( entity.handle ) response += entity.handle + '_'
	if( entity.type ) response += entity.type + '_'
	if( entity.name ) response += entity.name + '_'
	if( entity.subtype ) response += entity.subtype + '_'
	if( entity.faction ) response += entity.faction + '_'
	if( entity.id ) response += '_' + entity.id

	if( !response && entity.uuid )  response += '_' + entity.uuid.substr(0, 4)

	return response
}


const floor_vector = vec3 => {
	vec3.x = Math.floor( vec3.x )
	vec3.y = Math.floor( vec3.y )
	vec3.z = Math.floor( vec3.z )
	return vec3
}


const return_fail = ( private_err, public_err, preface ) => {
	if( preface ) log('flag', 'what was preface for ... ', preface  )
	// log('flag', preface ? preface : 'return_fail: ', private_err )
	log('flag', 'return_fail: ', private_err, public_err )
	return {
		success: false,
		msg: public_err,
	}
}

const return_fail_res = ( response, private_msg, public_msg ) => {
	log('flag', private_msg || 'return fail (response)' )
	return response.json({
		success: false,
		msg: public_msg,
	})
}

const return_fail_socket = ( args ) => {
	const {
		socket, 
		msg, 
		time, 
		private_msg,
	} = args

	if( !socket ) return log('flag', 'no socket for err:', private_msg || msg )

	if( private_msg ) log('flag', 'return-fail-socket: ', private_msg )

	socket.send(JSON.stringify({
		type: 'hal',
		msg_type: 'error',
		msg: msg,
		time: time,
	}))
	return false

}


const is_admin = ( request, user ) => {
	const admins = env.ADMINS || []
	const mail = request?.session?.USER?.email || user?.email
	if( admins.includes( mail ) ) return true
	return false
}

const is_logged = ( request, user ) => {
	const id = request?.session?.USER?.id || user?.id
	if( typeof id === 'number' && request.session?.USER?.confirmed ) return true
	return false
}



const allowedAttributes = {
}
const allowedTags = [
	// 'h1','h2','h3','h4','h5','h6','div','b','span','p','em','u','a','s','strong','table','tr','td','ul','li','br', 'img',
]
for( const tag of allowedTags ){
	// allowedAttributes[tag] = ['style', 'src']
	// allowedAttributes[tag] = ['src', 'alt', 'width', 'height', 'style', 'class', 'data-*', 'href', 'target']
}

const user_data = ( msg, params ) => {

	if( typeof msg !== 'string' )  return msg

	params = params || {}

	let res = msg

	if( params.new_lines ) res = res.replace(/\<br\/?\>/g, '\n')
	if( params.strip_html ) res = res.replace(/(<([^>]+)>)/gi, '')
	if( params.line_breaks ) res = res.replace(/\n/g, '<br>')
	if( params.encode ) res = encodeURIComponent( res ) // or encodeURI for less strict encoding
	if( params.apply_links ){
		res = render_link( res )
	}
	if( params.nbsp ) res = res.replace(/ /g, '&nbsp;')
	if( params.sanitize ){
		res = sanitize_html( res, {
			allowedTags,
			allowedAttributes
		})
	}

	return res

}


const to_alphanum = ( value, loose ) => {

	if( typeof value !== 'string' ) return false
	if( loose ){
		return value.replace(/([^a-zA-Z0-9 _-|.|\n|!])/g, '')
	}else{
		return value.replace(/([^a-zA-Z0-9 _-])/g, '')
	}

}


const formdata_to_obj = formdata => {

	let split = formdata.split('&')
	split = split.map( pair => {
		const duo = pair.split('=')
		for( let i = 0; i < 2; i++ ){
			duo[i] = duo[i] ? decodeURIComponent( duo[i] ).replace(/\+/g, ' ') : undefined
		}
		return duo
	})
	const parsed = {}
	for( let pair of split ){
		parsed[ pair[0] ] = pair[1]
	}

	return parsed

}

const random_bar_color = ( len ) => {

	let s = ''
	
	for( let i = 0; i < len; i++){
		s += ( 8 + Math.floor( Math.random() * 8 ) ).toString( 16 )
	}
	
	return s

}


const is_pal_uuid = uuid => {
	if( typeof uuid !== 'string' || uuid.length !== PUBLIC.SLUG_LENGTH ) return false
	return true
}

const sleep = async( ms ) => {
	await new Promise( resolve => { 
		setTimeout( resolve , ms )
	})
	return true
}


const parse_slug = value => {
	if( typeof value === 'string' && value.match(/\/board\//) ){
		return value.substr( value.indexOf('/board/') + 7 )
	}else{
		return value
	} 
}





const make_debounce = ( fn, time, immediate, context_args ) => {
    let buffer
    return ( args ) => {
        if( !buffer && immediate ) fn( args, context_args )
        clearTimeout( buffer )
        buffer = setTimeout(() => {
            fn( args, context_args )
            buffer = false
        }, time )
    }
}


const abbreviate = ( string, len, abbrev_type ) => {

	if( typeof string !== 'string' ) return ''

	abbrev_type = abbrev_type || 'char'

	switch( abbrev_type ){
	case 'word':
		let words = string.split(' ')
		if( words.length > len ) return words.splice(0, len).join(' ') + '...'
		return string

	case 'char':
		if( string.length > len ) return string.substr(0, len ) + '...'
		return string

	default:
		log('flag','unknown abbrev type', abbrev_type )
		return ''
	}
}


const get_unique_uuid = async( DB, table, len, column ) => {

	column = column || 'uuid'

	if( typeof len !== 'number') return log('flag', 'invalid uuid len for unique', len )

	const pool = DB.getPool()
	const the_sql = `SELECT * FROM \`${ table }\` WHERE \`${ column }\`=?`
	let c = 0
	let the_uuid
	let res
	while( !the_uuid && c < 100 ){
		c++
		the_uuid = random_hex( len )
		// log('flag', 'quotes??', the_sql, the_uuid  )
		res = await pool.queryPromise( the_sql, the_uuid )
		if( res.error ) return log('flag', res.error )
		if( !res.results?.length ){
			break;
		}
		log('flag', 'overlapping uuid..')
	}

	return the_uuid

}



const format_name = name => {

	if( name.match(/authors/)) return null

	const parts = name.split(' ')
	if( parts.length === 1 ) return name

	return parts.pop() + ', ' + parts.join(' ')

}




const stream_body_to_path = async( body, full_path ) => {

	const dest = await fs.createWriteStream( full_path )

	const saved_path = await new Promise((resolve, reject) => {
		pipeline( body, dest, err => {
			if( err ) return reject( err )
			resolve( full_path )
		})
    });

    // log('flag', 'stream-body save body res: ', saved_path )

	return saved_path
}



const fetch_image = async( attempt_url, params ) => {
	const {
		in_app_path,
		resize,
	} = params

	const res = await fetch( attempt_url )
	if( res.ok ){
		
		const full_path = `${ env.ROOT }/${ in_app_path }`

		log('flag', 'attempting save', full_path )

		const saved_path = await stream_body_to_path( res.body, full_path )

		if( resize ){
			log('flag',' ---- unhandled resize image ----- ')
		}

		return saved_path
	}
	return false
}


const join_to_CSauth = ( first, last ) => {
	/*
		joins [first] to [last] and adds comma
	*/

	if( !first ) return 'invalid name'
	if( first.indexOf(',') !== -1 ) return first
	if( last ){
		return last + ', ' + first
	}
	return first
}

const CSauth_from_name = name => {
	/*
		convert plain string to CSV author
	*/
	try{
		
		if( typeof name !== 'string' ) return name
		let vals = name.replace(/\s+/g, ' ')
		vals = vals.split(' ')
		if( vals.length > 1 ){
			return vals.splice(1).join(' ').trim() + ', ' + vals[0].trim()
		}
		return vals[0]

	}catch(err){
		log('flag', 'CSauth_from_name err', err )
		return name
	}
}

const name_from_CSauth = string => {
	/*
		return plain name from CSV name
	*/

	if( typeof string !== 'string' ) return ''

	const names = string.split(',')
	if( names.length > 2 ){
		log('flag', 'unable to format name properly')
	}else if( names.length > 1 ){
		return `${ names[1] }, ${ names[0] }`
	}
	return names[0]
}

// const format_author = ( type, value ) => {
// 	let vals

// 	switch( type ){

// 	case 'plain':
// 		break;

// 	case 'comma':
// 		if( typeof value === 'string' ){
// 			if( value.indexOf(',') > -1 ){ // already split
// 				return value
// 			}else{ // split a plain string
// 				vals = vals.replace(/\s+/g, ' ')
// 				vals = value.split(' ')
// 				if( vals.length === 1 ) return vals
// 				return 
// 			}
// 		}
// 		break;

// 	case 'array': // probably never use this anyway..
// 		if( Array.isArray( value )) return value
// 		if( typeof value !== 'string' ){
// 			log('flag', 'invalid author value', typeof value )
// 			return []
// 		}
// 		// already has comma
// 		if( value.indexOf(',') > -1 ){
// 			vals = value.split(',')
// 			if( vals.length > 1 ){
// 				log('flag', 'author name too many commas', value )
// 			}
// 			return [ vals[0].trim(), vals[1].trim() ]
// 		}
// 		// plain string
// 		vals = vals.replace(/\s+/g, ' ');
// 		vals = value.split(' ')
// 		if( vals.length === 1 || vals.length === 2 ){
// 			return vals
// 		}else if( vals.length > 2 ){
// 			return [ vals[0], vals.slice(1).concat(' ') ]
// 		}else{
// 			log('flag', 'unable to format author string', value )
// 			return []
// 		}


// 	default: 
// 		log('flag', 'invalid author type', type )
// 		return value
// 	}
// }

const to_characters = args => {
	const {
		string,
		disallow_num,
		allow_caps,
	} = args
	if( typeof string !== 'string' ) return '';
	let _string = string
	let pattern
	_string = _string.replace(/\([^)]*\)/, '')
	if( disallow_num ){
		pattern = /[^\p{L}]/gu;
	}else{
		pattern = /[^\p{L}\p{N}]/gu;
	}
	if( !allow_caps ) _string = _string.toLowerCase()
	return _string.replace( pattern, '').trim()
}

const derive_title = ( title, params ) => {
	const {
		allow_parens, 
		allow_the,
		allow_case,
		allow_commas,
		allow_colons,
		allow_dashes,
		allow_spaces,
		encode,
	} = params || {}

	if( typeof title !== 'string' ) return 'invalid title'
	// trim for easier regex
	title = title.trim()
	// case
	if( !allow_case ) title = title.toLowerCase()
	// strip leading the
	if( !allow_the ) title = title.replace(/^the\s*/i, '')
	// strip all parens
	if( !allow_parens ) title = title.replace(/\(.*\)/g, '').replace(/  /g, ' ')
	// commas
	if( !allow_commas ) title = title.replace(/\,/g, '')
	// colons	
	if( !allow_colons ) title = title.replace(/\:/g, '').replace(/\;/g, '')
	// dashes	
	if( !allow_dashes ) title = title.replace(/\-/g, '')
	// spaces	
	if( !allow_spaces ) title = title.replace(/\s/g, '')
	// trim again post regex
	title = title.trim()
	// encode
	if( encode ) title = encodeURIComponent( title )

	return title
}










const render_link = data => {

	if( typeof data !== 'string' ){
		log('flag', 'strings only for link formatting')
		return data
	}

	const exp = /^(http\:\/\/|https\:\/\/)?([a-z0-9][a-z0-9\-]*\.)+[a-z0-9\-]{2,25}\/?.*/ig;

	const split1 = data.split(' ')

	let value, split2, split3
	for( let x = 0; x < split1.length; x++ ){

		split1[x] = split2 = split1[x].split(/\n/)

		for( let i = 0; i < split2.length; i++ ){

			split2[i] = split3 = split2[i].split(/\<br\/?>/)

			for( let z = 0; z < split3.length; z++ ){

				value = ''
				// const match = split2[i].match( exp )
				const match = split3[z].match( exp )
				if( match ){
					if( !split3[z].match(/^https?:\/\//) ) split3[z] = 'http://' + split3[z]
					value = split3[z].replace( exp, '<a href="' + split3[z] + '" target="_blank" rel="nofollow">' + split3[z] + '</a>' )
				}else{
					value = split3[z]
				}

				split3[z] = value

			}

			split2[i] = split3.join('<br>')

		}

		split1[x] = split2.join(`\n`)

	}

	return split1.join(' ')

}


const trim_date_locale_string = string => {
	return string.replace(/\/[0-9]{4},/, '').replace(/:\d{2}\s/, " ")
}

const trim_memory = ( mem, len, deepclone ) => {
	if( !mem ) return ''
	if( deepclone ){
		const obj = JSON.parse( JSON.stringify( mem ))
		if( !obj.content ) obj.content = ''
		if( obj.content.length > len ){
			obj.content = obj.content.substr(0, len) + '...'
		}
		return obj // de-reference and return
	}
	// or, mutate in place
	if( !mem.content ) mem.content = ''
	if( mem.content.length > len ){
		mem.content = mem.content.substr(0, len) + '...'
	}
}


const trim_log_history = prompts => { 
	/* MUTATES */
	try{
		for( const msg of prompts || [] ){
			trim_memory( msg, 20 )
			delete msg.stamp
		}		
	}catch( err ){
		log('flag','err trim args', err )
	}
}

const get_nonce_day = () => {
	return Math.floor( Date.now() / ( 1000 * 60 * 60 * 24 ) )
}


const fuzzyMatchLevenshtein = (target, query) => {
	/*
		fuzzy match with score substracted for position
	*/
	
    const m = target.length;
    const n = query.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const matrix = [];
    for (let i = 0; i <= m; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = (target[i - 1] !== query[j - 1]) ? 1 : 0;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[m][n];
}

const fuzzyMatchLCS = ( target, query ) => {
	/*
		match string anywhere..
		.. scoring still mysterious to me though
	*/
	log('flag', 'unhandled fuzzy least common substr')
	return 0

    const m = target.length;
    const n = query.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const matrix = [];
    let maxLength = 0;
    let lastSubsBegin = 0;

    for (let i = 0; i <= m; i++) {
        matrix[i] = [0];
    }
    for (let j = 0; j <= n; j++) {
        matrix[0][j] = 0;
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (target[i - 1] === query[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
                if (matrix[i][j] > maxLength) {
                    maxLength = matrix[i][j];
                    lastSubsBegin = i - maxLength;
                }
            } else {
                matrix[i][j] = 0;
            }
        }
    }

    return maxLength;

}

// // Example usage:
// const targetString = "cupcake";
// const queryString = "cucpake";
// const distance = fuzzyMatch(targetString, queryString);
// console.log(`The Levenshtein distance between '${targetString}' and '${queryString}' is ${distance}.`);





const util_err_msg = ( name ) => {
	try{
		fs.readFileSync( env.ROOT + '/client/js/utilities/init_' + name + '.js')
	}catch(err){
		return 'missing js for: ' + name
	}
	try{
		fs.readFileSync( env.ROOT + '/client/css/utilities/' + name + '.css')
	}catch( err ){
		return 'missing css for: ' + name
	}
	return undefined
}

const bot_to_hilberts = entry => {
	return {
		created: entry.created,
		prompt: entry.prompt,
		completion: entry.completion,
	}
}

const hilbert_to_bot = entry => {

}


const jlog = obj => {
	if( typeof obj !== 'object') return ''
	return JSON.stringify( obj, false, 2 )
}


const deepclone = obj => {
	return JSON.parse( JSON.stringify( obj ) )
}


function convertToHex(value) {
  if (value.startsWith('rgb')) {
    // If value is RGB, extract the red, green, and blue values
    const rgbValues = value.match(/\d+/g);
    const red = parseInt(rgbValues[0]);
    const green = parseInt(rgbValues[1]);
    const blue = parseInt(rgbValues[2]);

    // Convert the RGB values to hex and concatenate them
    const hexValue = '#' + ((red << 16) | (green << 8) | blue).toString(16).padStart(6, '0');
    return hexValue;
  } else if (value.startsWith('#')) {
    // If value is already a hex value, return it
    return value;
  } else {
    // Otherwise, assume it's an invalid input
    // throw new Error('Invalid input');
    console.error('invalid color convert: ' + value )
  }
}

const is_hex_color = color => {
	return ( typeof color === 'string' && !color.match(/[g-z]/i) && color.length >= 6 && color.length <= 9 )
}

const char_map = {
	a: 10,
	b: 11,
	c: 12,
	d: 13,
	e: 14,
	f: 15,
}

const offset_color = ( color, contrast_bool, add_alpha ) => {
	
	color = convertToHex( color || '#000000' )

	if( !is_hex_color( color ) ){
		console.log('invalid hex color: ', color )
		return contrast_bool ? '#000000' : '#222222'
	}

	let c = color.replace('#', '').substr(0,6)

	// console.log('testing bg color: ', color, c )

	let num
	const rgb = {r: 0, g: 0, b: 0}
	for( let i = 0; i < c.length; i++ ){

		const n = Number( c[i] )

		if( typeof n === 'number' && !isNaN( n ) ){
			num = n
		}else if( char_map[ c[i] ]){
			num = char_map[ c[i] ]
		}else{
			num = 0
			// console.log('invalid num', n )
		}

		// console.log(`adding index ${ i } color: ${ num }`)

		if( i < 2 ){ // red
			rgb.r += ( i === 0 ) ? num * 16 : num
		}else if( i < 4 ){ // green
			rgb.g += ( i === 2 ) ? num * 16 : num
		}else{ // blue
			rgb.b += ( i === 4 ) ? num * 16 : num
		}

	}

	// console.log(`rgb res:`, rgb )

	// https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
	const computed = ( rgb.r * .299 ) + ( rgb.g * .587 ) + ( rgb.b * .114 )

	let val

	if( computed > 150 ){ // 186 standard
		val = contrast_bool ? '#000000' : '#222222'
	}else{
		val = contrast_bool ? '#ffffff' : '#dddddd'
	}

	if( add_alpha ){
		val += add_alpha
	}

	return val

}


function invertHexColor(hex) {
    // Remove the # sign if present
    hex = hex.replace('#', '');

    // Convert the hex color to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Calculate the inverted RGB values
    let invertedR = 255 - r;
    let invertedG = 255 - g;
    let invertedB = 255 - b;

    // Convert the inverted RGB values back to hex
    let invertedHex = '#' + ((1 << 24) + (invertedR << 16) + (invertedG << 8) + invertedB).toString(16).slice(1);

    return invertedHex;
}


const charcode = ( num, shift_for_alpha, upper ) => {
	let val = String.fromCharCode( num + ( shift_for_alpha ? 65 : 0 ) )
	if( !upper ) val = val.toLowerCase()
	return val
}


function capitalize( word ){

	if( typeof( word ) !== 'string' ) return false

	let v = word.substr( 1 )

	word = word[0].toUpperCase() + v

	return word

}


const get_username = user => {
	return user.handle || user.slug || 'anon user'
}

const get_funder_name = ( entity, print_no_name ) => {
	const {
		name,
		surname,
	} = entity || {}

	const _name = name || ''
	const _surname = surname || ''

	return ( name + ( name ? ' ' : '' ) + surname ) || ( print_no_name ? '(no name)' : '' )

}




const second = 1000
const minute = second * 60
const hour = minute * 60
const day = hour * 24
const week = day * 7
const month = day * 30
const year = week * 52

const times = {
	second,
	minute,
	hour,
	day,
	week,
	month,
	year,
}

const hundred = 100
const thousand = 1000
const million = 10 * hundred * thousand
const billion = million * 1000
const trillion = billion * 1000
const quadrillion = trillion * 1000

const amounts = {
	hundred,
	thousand,
	million,
	billion,
	trillion,
	quadrillion
}

const get_subdir = stamp => {
	if( !is_num( stamp ) ) return 'invalid'
	if( String( stamp ).length !== 13 ) return 'invalid'
	const date = new Date( Number( stamp ) )
	const year = date.getYear() - 100
	const month = date.getMonth()
	return year + '/' + month
}

const auto_date = value => {
	let part = Date.now() - value < day ? 1 : 0
	return new Date( value ).toLocaleString().split(',')[part]
}



const throw_err = msg => {
	try{
		throw new Error( msg )
	}catch( err ){
		log('flag', err )
	}
}


const round_stamp = ( timestamp, modulo_min, dir ) => {
	/*
		input ms
		output ms
	*/

    const date = new Date( timestamp );
    const minutes = date.getMinutes();
    const remainder = minutes % modulo_min;
    
    if( dir == 'up' || !dir ){

	    if( remainder !== 0 ){
	        const rounded = minutes + ( modulo_min - remainder );
	        date.setMinutes( rounded );
	    }

    }else if( dir == 'down' ){

    	date.setMinutes( minutes - remainder )

    }

    date.setSeconds(0);
    date.setMilliseconds(0);
    
    return date.getTime();
}


const get_active_state = args => {
	const  {
		elapsed,
	} = args

	const _times = {
		gone: env.LOCAL ? times.second * 30 : times.minute * 10,
		idle: env.LOCAL ? times.second * 10 : times.minute * 2,
	}

	if( typeof elapsed !== 'number' ) return 'gone'

	if( elapsed > _times.gone ){
		return 'gone'
	}else if( elapsed > _times.idle ){
		return 'idle'
	}else{
		return 'active'
	}

}



function scry( x, old_min, old_max, new_min, new_max ){

	const first_ratio = ( x - old_min ) / ( old_max - old_min )
	const result = ( first_ratio * ( new_max - new_min ) ) + new_min
	return result
}


const res_fail = ( response, private_err, public_err ) => {
	log('flag', private_err )
	return response.send( JSON.stringify({
		success: false,
		msg: public_err,
	}))
}



export default {
	static_chars,
	get_public,
	check_collision,	
	iso_to_ms,
	ms_to_iso,
	random_hex,
	random_int,
	random_offset,
	random_entry,
	random_range,
	// is_valid_uuid,
	is_valid_name,
	is_valid_id,
	is_valid_email,
	is_valid_password,
	is_num,
	// getBaseLog,
	sanitize_packet,
	jarble_chat,
	validate_number,
	validate_string,
	validate_boolean,
	validate_date,
	merge_results_to_object,
	bad_packet,
	identify,
	floor_vector,
	return_fail,
	return_fail_socket,
	return_fail_res,
	is_admin,
	is_logged,
	user_data,
	to_alphanum,

	formdata_to_obj,
	random_bar_color,
	is_pal_uuid,
	parse_slug,
	sleep,
	make_debounce,
	abbreviate,
	get_unique_uuid,
	format_name,
	stream_body_to_path,
	fetch_image,

	derive_title,
	// parse_first_last,
	// join_first_last,
	CSauth_from_name,
	join_to_CSauth,
	name_from_CSauth,

	render_link,
	trim_date_locale_string,
	trim_memory,
	trim_log_history,
	get_nonce_day,
	fuzzyMatchLevenshtein,
	fuzzyMatchLCS,
	util_err_msg,
	bot_to_hilberts,
	hilbert_to_bot,
	jlog,
	deepclone,
	offset_color,
	invertHexColor,
	charcode,
	capitalize,
	get_funder_name,
	get_username,
	times,
	to_characters,
	amounts,
	get_subdir,
	auto_date,
	throw_err,
	round_stamp,
	get_active_state,
	scry,
	res_fail,
}