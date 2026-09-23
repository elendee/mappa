import NodeClam from 'clamscan';
import log from './log.js'





// https://www.npmjs.com/package/clamscan#basic-usage-example

let clamscan
new NodeClam().init({
	removeFiles: true,
})
.then( scanner => {
	clamscan = scanner
})



const scan = async( abs_path ) => {

	if( typeof abs_path !== 'string' ) return 'must provide string to file scanner (' + typeof abs_path + ')'

    try {

        // You can re-use the `clamscan` object as many times as you want
        // const version = await clamscan.getVersion();

        const {
        	isInfected, 
        	file, 
        	viruses
        } = await clamscan.isInfected( abs_path );

        if( isInfected ){
        	return `${abs_path} is infected`
        }

        return 0

    } catch (err) {
    	log('flag', 'clamscan err', err )
    	return 'there was an error scanning: ' + abs_path
    }
    
}



export {
	scan,
}