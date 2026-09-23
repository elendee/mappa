import env from './.env.js'
import qrcode from 'qrcode'
import log from './log.js'
import lib from './lib.js'



/*

https://www.npmjs.com/package/qrcode

qrcode.toString('Encode this text in QR code', {
  errorCorrectionLevel: 'H',
  type: 'svg'
}, function(err, data) {
});

qrcode.toFile('/output-file-path/file.png', 'Encode this text in QR code', {
  errorCorrectionLevel: 'H'
}, function(err) {
});

*/


if( !env.QR_PATH?.PRIVATE ) throw new Error('must config QR path')


const buffers = {}

const make = async( request ) => {
	const id = request.session?.id
	if( buffers[id] ) return lib.return_fail('buffered qr', 'please wait a few seconds')
	buffers[id] = setTimeout(() => {
		delete buffers[id]
	}, 5000 )

	const {
		// link,
		text,
		output,
		color_fg,
		color_bg,
		margin,
	} = request.body

	const resolve_value = text // link
	if( !resolve_value ) return lib.return_fail( 'no value for qr', 'no value provided')

	if( typeof resolve_value !== 'string' ) return lib.return_fail('invalid qr type', 'invalid value type')
	const MAX = 3 * 1000
	const length = resolve_value?.length
	if( length > MAX ) return lib.return_fail('overlong qr', 'max ' + MAX + ' chars - QR codes quality drops off at longer inputs')

	const types = {
		text: {
			type: 'text',
		},
		png: {
			type: 'image/png',
			suffix: 'png',
		},
		svg: {
			type: 'svg',
			suffix: 'svg',
		}
	}
	// type
	const type = types[ output ]?.type || 'text'
	const suffix = types[ output ]?.suffix 
	// error correct
	const error_level = get_correction_level( length )
	// margin
	const margin_val = margin || 1
	const string_types = ['text', 'svg']
	const is_string = string_types.includes( output )

	const OPTIONS = {
		errorCorrectionLevel: error_level,
		type,
		// quality: 0.3,
		margin: is_string ? undefined : margin_val,
		color: {
			dark: color_fg || '#000000', // QR code color
			light: color_bg || '#FFFFFF' // Background color
		}
	}

	let slug
	const qr_code = await new Promise(( resolve, reject ) => {
		if( output === 'text' ){ // is_string
			qrcode.toString( resolve_value, OPTIONS, ( err, data ) => {
				if( err ) return reject( err )
				resolve( data )
			})
		}else{
			slug = 'qr_' + Date.now() + '_' + lib.random_hex(4) + '.' + suffix
			qrcode.toFile( env.QR_PATH.PRIVATE + '/' + slug, resolve_value, OPTIONS, ( err, data ) => {
				if( err ) return reject( err )
				resolve( data )
			})
		}
	})

	const result = {
		success: true,
		qr_code,
		path: slug ? env.QR_PATH.PUBLIC + '/' + slug : undefined,
	}

	// log('flag', 'make qr: ', request.body )
	// log('flag', 'result', result )

	return result

}


const get_correction_level = length => {
	if( length < 200 ) return 'H'
	if( length < 500 ) return 'Q'
	if( length < 1000 ) return 'M'
	return 'L'
}




export default {
	make
}