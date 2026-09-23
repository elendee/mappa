import env from '../.env.js'

// const {
// 	Vector3,
// } = require('three')


const PAGES = [
	'admin',
	'profile',
	'contact',
	'about',
	'privacy',
	// 'connects',
	'establishment',
	'svgs',
]

export default {

	name_length: 25,

	STRIPE: env.PRIVATE_STRIPE,

	IMAGE: {
		CONSTRAIN: {
			MAIN: 1000,
			THUMB: 200,
		},
	},

	LIMITS: {	
		REG_USER_CAP: 150,
	},

	OTHER_TYPES: [
		'pdf',
		'csv',
	],

	IMAGE_TYPES: [
		'jpg',
		'png',
		'jpeg',
		'gif',
	],

	INIT: {
		BOOT_SOCKETS: 1,	
	},

	USER_SLUG_LENGTH: 4,

	UPLOAD_DIRS: {
	},

	pages: PAGES,

	VALID_MODELS: {
		'gpt-4': 'gpt-4',
		'gpt-3.5-turbo': 'gpt-3.5-turbo',
		'text-davinci-003': 'text-davinci-003',
	},



	IMAGE: {
		CONSTRAIN: {
			LARGE: 1000,
			THUMB: 200,
		}
	},

	FS_ROOT: env.PRIVATE_FS_ROOT,

	VAPID_KEY: 'error - should instantiated at boot',

}
