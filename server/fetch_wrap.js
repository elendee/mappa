// import log from './log.js'
// import fetch from 'got'

// export default async( url, method, parse, data ) => {

// 	let options
// 	if( method ) options = {
// 		method: method
// 	}

// 	let body
// 	if( method.match(/post/i) ){
// 		options.body = JSON.stringify( data )
// 		options.headers = {
// 			'Content-Type': 'application/json'
// 		}
// 	}

// 	const res = await fetch( url, options )

// 	let result

// 	switch( parse ){
// 		case 'json':
// 			result = await res.json()
// 		default: 
// 			result = res
// 			break
// 	}

// 	return {
// 		success: true,
// 		res: result,
// 	}

// }


const fetch_wrap = ( url, method, body, add_headers ) => {

	return new Promise( ( resolve, reject ) => {

		if( method.match(/post/i) ){

			fetch( url, {
				method: 'post',
				headers: {
					'Content-Type': 'application/json',
					...add_headers,
				},
				body: JSON.stringify( body )
			})
			.then( res => {
				res.json()
				.then( r => {
					resolve( r )
				}).catch( err => {
					reject( err )
				})
			}).catch( err => {
				reject( err )
			})
			.catch( err => {
				reject( err )
			})

		}else if( method.match(/get/i) ){

			fetch( url )
			.then( res => {
				res.json()
				.then( r => {
					resolve( r )
				}).catch( err => {
					reject( err )
				})
			}).catch( err => {
				reject( err )
			})
			.catch( err => {
				reject( err )
			})

		}else{
			reject('invalid fetch ' + url )
		}

	})

}


export default fetch_wrap