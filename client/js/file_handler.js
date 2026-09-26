import GLOBAL from './GLOBAL.js'
import hal from './hal.js'
import ui from './ui.js'
import Spinner from './Spinner.js'



const spinner = new Spinner({
	type: 'svg',
})
// artist, title, size, description, anon, pillar_uuid, slot_index
const xhr_piece = async( args ) => {
	const {
		file, 
		data, 
		hide_spinner
	} = args

	const _data = data || {}

	const formData = new FormData()
	formData.enctype = 'multipart/form-data'
	// formData.append('type', 'piece')
	formData.append('upload', file ) // post value, file, name  // 'some-' + lib.random_hex( 6 ) // filename should be serverside
	// formData.append('artist', artist )
	// formData.append('title', title )
	// formData.append('size', size )
	// formData.append('description', description )
	for( const key in _data ){
		if( key !== 'upload'){
			formData.append( key, _data[ key ] )
		}
	}

	const xhr = new XMLHttpRequest()

	if( !hide_spinner ) spinner.show()

	const res = await new Promise((resolve, reject) => {

		xhr.open('POST', '/file_handler', true )

		xhr.onreadystatechange = function() {

			if( this.readyState == XMLHttpRequest.DONE ){

				try{

					// console.log( 'file_handler res: ', this.response )

					const response = JSON.parse( this.response )

					resolve( response )

					// if( response.success ){
					// 	resolve( response )
					// }else{
					// 	hal('error', response.msg || 'error uploading')
					// 	console.log('upload res: ', response )
					// }

				}catch(e){
					if( this.response.match(/too large/i)){
						hal('error', 'image uploads must be ' + GLOBAL.UPLOAD_LIMIT_MB + 'mb or smaller', 10 * 1000)
					}
					reject( e )
				}

			}else{
				// data chunks here  // console.log('xhr readyState: ', this.readyState ) [ 0, 1, 2, ... ]
			}

		}

		xhr.send( formData )

		xhr.onerror = err => {
			console.log( err )
			reject( err )
		}

	})

	spinner.hide()

	return res

}



export {
	xhr_piece,
}

