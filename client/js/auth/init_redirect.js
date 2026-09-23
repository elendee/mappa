;(async() => {

if( document.getElementById('redirect') ){

	let loc = document.getElementById('redirect').getAttribute('data-redirect') 

	// if( loc.match(/^\//) ){
	// 	loc
	// }

	if( location.href.match(/localhost/) ){
		document.body.innerText = 'redirecting to: ' + loc + '\nin 20s\n'
		const button = document.createElement('a')
		button.href = '/'+loc
		button.innerText = 'or click'
		document.body.append( button )
		await new Promise( resolve => {
			setTimeout( resolve, 20 * 1000 )
		})
	}

	location.href = '/' + loc

}else{
	location.href = '/'
}



})();
