import env from './env.js?v=78'
import hal from './hal.js?v=78'
import fetch_wrap from './fetch_wrap.js?v=78'
import ui from './ui.js?v=78'
import * as lib from './lib.js?v=78'
import GLOBAL from './GLOBAL.js?v=78'
import USER from './USER.js?v=78'









const update_notify = async( e ) => {

	const checkbox = e.target
	const name = checkbox.getAttribute('name')

	if( name === 'block' && checkbox.checked ){
		for( const input of notifies ){
			if( input.getAttribute('name') === 'block' ) continue
			if( input.checked ){
				await set_notify( input.getAttribute('name'), false )
			}
			input.checked = false
		}
	}

	await set_notify( name, checkbox.checked, true )

} // update notify







const set_notify = async( name, value, show_msg ) => {

	const res = await fetch_wrap('/action_account', 'post', {
		action: 'update_notify',
		name: name,
		value: value,
	})

	if( !show_msg ) return;

	if( res?.success ){
		hal('success', 'updated', 3000 )
	}else{
		if( res.msg?.match('failed to enable')){
			for( const ele of notifies ){
				if( ele.getAttribute('name') === res.msg.split(' ')[0] ){
					setTimeout(() => {
						ele.checked = false
					}, 10 )
				}
			}
		}
		hal('error', res?.msg || 'failed to update', 13000 )
	}

} // set notify





const initPushStatus = async() => {
	// 1) Is this browser even capable?
	if( !('serviceWorker' in navigator) || !('PushManager' in window) ){
		return { 
			supported: false, 
			permission: 'unsupported', 
			subscribed: false 
		};
	}

	// 2) Current permission: 'granted' | 'denied' | 'default'
	const permission = Notification.permission; // from window.Notification
	// Optional: const permission = await navigator.permissions.query({ name: 'notifications' });

	// 3) Check existing subscription for this device+origin
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription(); // null if none

	let device_in_db

	let res = await fetch_wrap('/action_account', 'post', {
		action: 'get_push_presence',
		subscription,
	}, true )

	if( res?.success ){
		device_in_db = true
	}

	return {
		supported: true,
		permission,          // 'granted' | 'denied' | 'default'
		subscribed: !!subscription,
		subscription,         // actual PushSubscription or null
		device_in_db,
	};

} // init push status





const set_push_state = async( args ) => {
	const {
		checked,
	} = args

	allow_push.input.disabled = true

	// Get existing registration (no re-register every toggle)
	const registration = await navigator.serviceWorker.register('/sw.js');

	let res

	if( checked ){

		const state = await Notification.requestPermission();
		if( state !== 'granted' ){
			allow_push.input.checked = false;  // Revert
			allow_push.input.disabled = false
			return hal('error', 'Permission denied', 3000 );
		}

		// CRITICAL: Subscribe (needs VAPID publicKey from server)
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: GLOBAL.VAPID_KEY  // Fetch from /vapid
		});

		// console.log('hallo', {
		// 	subscription,
		// })

		res = await fetch_wrap('/action_account', 'post', {
			action: 'set_push_state',
			allow_push: true,
			subscription: subscription.toJSON()  // Send this!
		}, true);

		if( !res?.success ){
			allow_push.input.checked = false;
			allow_push.input.disabled = false
			return hal('error', res?.msg || 'Save failed', 3000 );
		}

		hal('success', 'Subscribed!', 3000 );

	}else{
		// Unsubscribe
		const subscription = await registration.pushManager.getSubscription();
		if( subscription ) await subscription.unsubscribe();
	
		res = await fetch_wrap('/action_account', 'post', { 
			action: 'set_push_state', 
			allow_push: false ,
			subscription: subscription.toJSON(),
		});

		hal('success', 'Unsubscribed', 3000 );

	}

	allow_push.input.disabled = false

} // set push state





const init_sub_setting = async() => {

	if( !('serviceWorker' in navigator ) ) return false;

	const registration = await navigator.serviceWorker.register('/sw.js');
	// const ready = await navigator.serviceWorker.ready;

	const {
		supported,
		permission,
		subscribed,
		subscription,
		device_in_db,
	} = await initPushStatus()

	if( env.LOCAL ) console.log({
		supported,
		permission,
		subscribed,
		subscription,
		device_in_db,
	})

	allow_push.input.checked = !!( permission === 'granted' && subscribed && device_in_db );

} // init sub setting






let allow_push, notifications_wrap, notifies

const init = async( args ) => {
	// const {
	// 	notifications_wrap,
	// 	allow_push,
	// 	notifies,
	// } = args
	allow_push = args.allow_push
	notifies = args.notifies
	notifications_wrap = args.notifications_wrap

	let email_notify = notifications_wrap.querySelector('input[name=messages]')

	for( const input of notifies ){
		if( USER[ 'notify_' + input.name ] ){
			input.checked = true
		}
	}

	for( const notify of notifies ){
		notify.addEventListener('change', update_notify )
	}

	notifications_wrap.append( allow_push.wrap )

	allow_push.input.addEventListener('change', async(e) => {
		if( !( 'serviceWorker' in navigator ) ){
			allow_push.input.checked = false
			return hal('error', 'push notifications not available on this device', 3000 )
		}
		const checked = allow_push.input.checked;
		set_push_state({
			checked,
		})
		if( checked ){
			if( email_notify.checked ){
				email_notify.click()
			}
		}
	})

	email_notify.addEventListener('change', async(e) => {
		if( email_notify.checked ){
			if( allow_push.input.checked ){
				allow_push.input.click()
			}
		}
	})

	init_sub_setting()

} // init



export default init