import Model from './Model.js'
import * as lib from '../lib.js'




const MAP = new Map()




class Tool extends Model {
	constructor( init ){
		super( init )
		init = init || {}
	}

	static render_image_form( args ){
		const {
			tool,
		} = args

		const wrap = lib.b('div', false, 'tool-image-form')

		const preview = lib.b('img')
		preview.src = Tool.get_img_slug( tool )
		wrap.append( preview )

		let previewUrl

		const img = lib.b('input', false, 'input')
		img.type = 'file'
		img.addEventListener('change', preview_image )
		wrap.append( img )

		MAP.set( img, {
			preview,
			img,
		})

		return wrap

	}

	static get_img_slug( tool ){

		return `/fs/thumbs/${lib.get_subdir({ slug: tool.img_slug })}/${tool.img_slug}`

	}


}


let previewUrl

const preview_image = e => {
	const img_input = lib.click_parent( e.target, 'input', false, 5 )

	const {
		img,
		preview,
	} = MAP.get( img_input )

    const file = img.files[0]
    if( !file ) return

    if( previewUrl ) URL.revokeObjectURL( previewUrl )

    previewUrl = URL.createObjectURL( file )
    preview.src = previewUrl

}



export default Tool