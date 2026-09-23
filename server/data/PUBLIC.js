import env from '../.env.js'
import log from '../log.js'
import SVGS from './SVGS.js'
import FIELDS from './FIELDS.js'





const times = {}
times.second = 1000
times.minute = times.second * 60
times.hour = times.minute * 60
times.day = times.hour * 24
times.week = times.day * 7
times.month = times.week * 4


const public_fs_root = env.PUBLIC_FS_ROOT


const BUFFER_NOTIFY_DM_HOURS = 1

const DATA = {

	SITE_URL: env.SITE_URL,
	SITE_TITLE: env.SITE_TITLE,

	FIELDS,

	CONFIRM_MINUTES: 15,

	BUFFERS: {
		POST_MS: ( env.LOCAL ? 5 : 60 ) * 1000,
		COMMENT_MS: ( env.LOCAL ? 5 : 30 ) * 1000,
	},

	LIMITS: {
		UPLOAD: {
			MB: 8,
			MB_PDF: 5,
			SEC_LIMIT: 15,
			GENERIC_MB: 1,
			BUFFER_S: 10,
			COUNT: 50,
		},
		QUERY: {
			HTTP_RESULTS: 100,
		},
		COOKIE_AGREE: 1000 * 60 * 60 * 24 * 30 * 12,
		CHAT: {
			MAX_CHAR: 10 * 1000, // allows for ascii with more timing
			MAX_CHAR_STANDARD: 1000, // normal chats
			MAX_COVE_HISTORY: 100,
			MEM_HISTORY: 100,
			TRANSLATE_CHARS: 2000,
			BUFFER_NOTIFY_DM_HOURS,
		},
		USER: {
			ASCII_COVER: 2500,
			ALLOW_UNLOGGED_ACCOUNT_DAYS: 180,
		},

		POETRY_MS: 30 * 1000,
		POETRY_LENGTH: 500,
	},

	PERMISSIONS: {
		all: ['default', 'logged', 'editor', 'admin'],
		logged: ['logged', 'editor', 'admin'],
		editor: ['editor', 'admin'],
		admin: ['admin'],
	},

	SKIP: env.SKIP,

	USER_404: 'owl3-white.png',

	NOTIFICATIONS: { // *email* notifications
		// block: {
		// 	desc: 'Prevent all notifications except password resets.',
		// 	label: 'block all',
		// },
		messages: {
			desc: `Email me when I get a DM, no more than every ${BUFFER_NOTIFY_DM_HOURS} hour${BUFFER_NOTIFY_DM_HOURS>1?'s':''}.`,
			label: 'email notifications',
		},
		// discussion: {
		// 	desc: 'Email me when someone replies to my comment in a group discussion.',
		// },
		// updates: {
		// 	label: 'site updates (not yet active)',
		// 	desc: `Email me when ${ env.SITE_TITLE } gets updates to it's functioning.`,
		// },
		// news: {
		// 	label: 'news (not yet active)',
		// 	desc: 'Email me weekly updates of site activity',
		// },
	},

	FILE_TYPES: {
	    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
	    document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'],
	    textFile: ['txt', 'csv', 'rtf'],
	    audio: ['mp3', 'wav', 'aac', 'flac'],
	    video: ['mp4', 'avi', 'mov', 'wmv', 'mkv'],
	    compressedFile: ['zip', 'rar', '7z', 'tar'],
	    programmingFile: ['html', 'css', 'js', 'json', 'xml', 'php', 'py', 'java', 'cpp'],
	    misc: ['svg', 'ico', 'apk', 'ini', 'sql']
	},

	FS_ROOT: public_fs_root,
	FS_ROOT_THUMB: `${public_fs_root}/thumbs`,
	FS_ROOT_PREVIEWS: `${public_fs_root}/previews`,


	FRIENDS: [
		'amigos',
		'amis',
		'amici',
		'amigos',
		'prieteni',
		'Freunde',
		'vrienden',
		'vänner',
		'друзья',
		'友達',
		'أصدقاء',
		'दोस्त',
		'朋友们',
		'arkadaşlar',
		'przyjaciele',
	],

	LANGUAGES: [
		['Tonga'],
		['Gaelic'],
		['Chinese'],
		['Spanish',],
		['English',],
		['Hindi',],
		['Arabic',],
		['Bengali',],
		['Portuguese',],
		['Russian',],
		['Japanese',],
		['Punjabi'],
		['German'],
		['Javanese',],
		['Korean'],
		['French',],
		['Telugu',],
		['Marathi'],
		['Turkish',],
		['Tamil',],
		['Urdu',],
		['Vietnamese'],
	],

	ICONS: {
		clock: 'clock.png',
		check: 'check.png',
		user: 'user.png',
	},

	VAPID_KEY: 'error - should be instantiated on boot',

	ASCII: {
		WIDTH: 100,
		// WIDTH: 60,
		HEIGHT: 70,
		// HEIGHT: 44,
	},

	PIXEL: {
		WIDTH: 40,
		// HEIGHT: 80,
	},

}


export default DATA
