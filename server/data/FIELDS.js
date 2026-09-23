/*
	all props:
	- type [ string | number | boolean | textarea | price | select | select_multi | upload | date | icon ]
	- prompt string
	- char_limit [min, max]
	- view string
	- required bool
	- no_save
	- no_edit
*/


// const PRESETS = {
// 	in_mem_string: {
// 		type: 'string',
// 		no_save: true,
// 		no_edit: true,
// 		view: 'all',
// 	},
// 	in_mem_bool: {
// 		type: 'boolean',
// 		no_save: true,
// 		no_edit: true,
// 		view: 'all',
// 	}
// }

const MODELS = {

	Friendship: {
		user_key1: {
			type: 'number',
		},
		user_key2: {
			type: 'number',
		},
		accept1: {
			type: 'boolean',
		},
		accept2: {
			type: 'boolean',
		},
	},

	Notification: {
		user_key: { // (receiver)
			type: 'boolean',
		},
		sender_key: {
			type: 'number',
		},
		cove_key: {
			type: 'number',
		},
		chat_key: {
			type: 'boolean',
		},
	},

	Visit: {
		ip: {
			type: 'string',
		},
		last_visited: {
			type: 'number',
		},
		email: {
			type: 'string',
		},
	},

	ConfirmCode: {
		user_key: {
			type: 'number',
		},
		code: {
			type: 'string',
			no_edit: true,
		},
	},

	Layer: {
		user_key: {
			type: 'number',
		},
		name: {
			type: 'string',
			required: true,
			char_limit: [0,255],
			view: 'all',
		},
		visible: {
			type: 'boolean',
			view: 'all',
		},
		index_layer: {
			type: 'number',
			view: 'all',
		},
		border_image: {
			type: 'string',
			char_limit: [0,500],
			view: 'all',
		},
		primary_color: {
			type: 'string',
			char_limit: [0,32],
			view: 'all',
			default: '#ff3366',
		},
		secondary_color: {
			type: 'string',
			char_limit: [0,32],
			view: 'all',
			default: '#3388ff',
		},
		tertiary_color: {
			type: 'string',
			char_limit: [0,32],
			view: 'all',
			default: '#33cc99',
		},
	},

	LayerElement: {
		layer_key: {
			type: 'number',
			required: true,
		},
		kind: {
			type: 'string',
			char_limit: [0,64],
			view: 'all',
		},
		name: {
			type: 'string',
			char_limit: [0,255],
			view: 'all',
		},
		lat: {
			type: 'number',
			view: 'all',
		},
		lng: {
			type: 'number',
			view: 'all',
		},
		icon: {
			type: 'string',
			char_limit: [0,255],
			view: 'all',
		},
		data: {
			type: 'textarea',
			is_json: true,
			view: 'all',
		},
		geojson: {
			type: 'textarea',
			is_json: true,
			view: 'all',
		},
	},

	MediaItem: {
		'user_key': {
			type: 'number',
			required: true,
		},
		'ext': { // ext
			type: 'string',
			no_edit: true,
			char_limit: [0,255],
			view: 'all',
		},
		'title': { // ext
			type: 'string',
			char_limit: [0,255],
			view: 'all',
		},
		'mime': { // ext
			type: 'string',
			no_edit: true,
			char_limit: [0,255],
			view: 'all',
		},
		'slug': {
			required: true,
			type: 'string',
			label: 'file slug',
			char_limit: [0,255],
			no_edit: true,
			view: 'all',
		},
		'is_public': {
			type: 'boolean',
			view: 'all',
		}
	},

	
	User: {
		// slug: {
		// 	type: 'string',
		// 	view: 'all',
		// },
		handle: {
			type: 'string',
			view: 'all',
		},
		email: {
			type: 'string',
			view: 'editor',
		},
		password: {
			type: 'string',
		},
		confirmed: {
			type: 'boolean',
			no_edit: true,
		},
		reset_time: {
			type: 'number',
			no_edit: true,
		},
		blocked: {
			type: 'number',
			no_edit: true,
		},
		portrait_slug: {
			type: 'string',
			no_edit: true,
			view: 'all',
			no_edit: true,
		},
		
		notes_private: {
			type: 'textarea',
			view: 'admin',
		},
		notes_public: {
			type: 'textarea',
			view: 'editor',
		},

		notify_block: {
			type: 'boolean',
			view: 'editor',
		},
		notify_messages: {
			type: 'boolean',
			view: 'editor',
		},
		notify_discussion: {
			type: 'boolean',
			view: 'editor',
		},
		notify_updates: {
			type: 'boolean',
			view: 'editor',
		},
		notify_news: {
			type: 'boolean',
			view: 'editor',
		},
		agree_cookies: {
			type: 'boolean',
			view: 'editor',
		},
		
		allow_push: {
			type: 'boolean',
		},

	},

}



const FIELDS = {

	MODELS,
	
	PERSISTS_UUID: {
		'MediaItem': 16,
		'User': 8,
		'Chat': 16,
		'Layer': 8,
		'LayerElement': 8,
	},

	HAS_PUBLIC: [
		//
	],

	STANDARD: {
		'id': {
			type: 'number',
			min: 0,
			no_edit: true,
			no_save: true, // handled by db.js
		},
		'uuid':{
			type: 'string',
			char_limit: [4,64],
			// public: true,
			no_edit: true,
			view: 'all',
		},
		'route': {
			type: 'string',
			no_edit: true,
			no_save: true, // not in db
			view: 'all',
		},
		'table': {
			type: 'string',
			no_edit: true,
			no_save: true, // not in db
			// view: 'all', // hmmmmmmm
		},
		'created': {
			type: 'number',
			no_edit: true,
			no_save: true,
			view: 'all',
		},
		'edited': {
			type: 'number',
			no_edit: true,
			no_save: true,
			view: 'all',
		},
	},
}

export default FIELDS