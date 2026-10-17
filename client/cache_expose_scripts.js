const scripts = {
	// auth
	dashboard: `<script type='module' defer='defer' src='/js/auth/init_dashboard.js'></script>`,
	default: `<script type='module' defer='defer' src='/js/auth/init_default.js'></script>`,
	add: `<script type='module' defer='defer' src='/js/auth/init_add.js'></script>`,
	admin: `<script type='module' defer='defer' src='/js/auth/init_admin.js'></script>`,
	contact: `<script type='module' defer='defer' src='/js/auth/init_contact.js'></script>`,
	user: `<script type='module' defer='defer' src='/js/auth/init_user.js'></script>`,
	await_confirm: `<script type='module' defer='defer' src='/js/auth/init_await-confirm.js'></script>`,
	send_confirm: `<script type='module' defer='defer' src='/js/auth/init_send-confirm.js'></script>`,
	redirect: `<script type='module' defer='defer' src='/js/auth/init_redirect.js'></script>`,
	error: `<script type='module' defer='defer' src='/js/auth/init_error.js'></script>`,
}


const styles = {

	// auth
	dashboard: `<link href='https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css' rel='stylesheet' />
	<link rel='stylesheet' href='/css/dashboard.css'>`,
	base: `<link rel='stylesheet' href='/css/base.css'>`,
	models: `<link rel='stylesheet' href='/css/models.css'>`,
	auth: `<link rel='stylesheet' href='/css/auth.css'>`,
	add: `<link rel='stylesheet' href='/css/add.css'>`,
	user: `<link rel='stylesheet' href='/css/user.css'>`,
	admin: `<link rel='stylesheet' href='/css/admin.css'>`,
	modal: `<link rel='stylesheet' href='/css/modal.css'>`,
	popups: `<link rel='stylesheet' href='/css/popups.css'>`,

	chat: `<link rel='stylesheet' href='/css/chat.css'>`,

	// highlight_light: `<link id='highlight-light' rel='stylesheet' href='/node_modules/highlight.js/styles/paraiso-light.min.css'>`,
	// highlight_dark: `<link id='highlight-dark' rel='stylesheet' href='/node_modules/highlight.js/styles/night-owl.min.css'>`,

	ele_user: `<link rel='stylesheet' href='/css/ele_user.css'>`,

	// pages
	page: `<link rel='stylesheet' href='/css/page.css'>`,

}


export {
	scripts,
	styles,
}