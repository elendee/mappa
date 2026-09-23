// self.addEventListener('notificationclick', event => {
// 	event.notification.close();
// 	clients.openWindow('/');
// });

self.addEventListener('push', event => {
	const data = event.data?.json() || { 
		title: 'New notification', 
		body: 'Hello!' 
	};

	console.log('sw push', {
		data,
	})

	self.registration.showNotification( data.title, {
		body: data.body,
		icon: '/resource/media/alcoves-icon.png'  // Optional
	});
});


self.addEventListener('notificationclick', event => {
	event.notification.close();
	const url = event.notification.data?.url || '/';
	event.waitUntil(async () => {
		const windowClients = await clients.matchAll({ 
			type: 'window', 
			includeUncontrolled: true 
		});
		const client = windowClients.find(c => c.url === url && 'focus' in c);
		if( client ){
			return client.focus();
		}
		return clients.openWindow(url);
	});
});


// self.addEventListener('push', event => {
//   const payload = event.data?.json() || {};
  
//   const options = {
//     body: payload.body,
//     icon: '/icon-192.png',
//     badge: '/badge.png',
//     data: payload.data  // Custom data for clicks
//   };

//   event.waitUntil(
//     self.registration.showNotification(payload.title, options)
//   );
// });