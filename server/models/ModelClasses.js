import fs from 'fs'
import path from 'path'
import log from '../log.js'
import { fileURLToPath } from 'url';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const modelsDir = path.join( __dirname )

const Classes = {}

const bypass = [
	'Model', 
	'ModelClasses',
]

const init = async() => {

	const done = await new Promise((resolve, reject) => {

		const files = fs.readdirSync( modelsDir )

		let req = files.length

		let count = 0

		files.forEach( file => {
			const bare = file.replace('.js', '')
			if( file.match(/\.js$/) && !file.match(/^_/) && !bypass.includes( bare ) ){
				import( path.join( modelsDir, file ) )
				.then( c => {
					const the_class = c.default
					const slug = file.replace('.js', '' )
					Classes[ slug ] = the_class
					// log('flag', 'requiring: ', file )
					if( !the_class.table ){
						log('flag', 'ModelClass missing static table: ', bare )
					}			
					count++
					if( count >= req ){
						resolve('done')
					}
					// log('flag', 'class-init', count, req, slug )

				})

			}else{
				count++
				// log('flag', 'skipping class-init file: ' + file )
			}
		})

	})

	return done

}

// log('flag', 'classes: ', Object.keys( Classes ))

export {
	Classes,
	init
}