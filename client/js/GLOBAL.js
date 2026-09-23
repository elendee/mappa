import env from './env.js?v=78'

const client_data = {
	BLOOM_LAYER: 1,
	ENTIRE_SCENE_LAYER: 0,
}

let glob = false

export default ( () => {

	if( glob ) return glob

	// const glob_data = document.querySelector('#global-data').innerText
	const glob_data = document.querySelector('#global-data').innerHTML

	if( !glob_data ){
		alert('missing server data')
	}

	try{
		glob = JSON.parse( glob_data )
		for( const key in client_data ) glob[ key ] = client_data[ key ]
	}catch( e ){
		alert('error parsing server data')
		console.log( e )
	}

	if( env.EXPOSE )  window.GLOBAL = glob

	return glob

})()