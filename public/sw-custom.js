self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body || 'You have a new announcement.',
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: '2'
                },
                actions: [
                    { action: 'explore', title: 'View Details' }
                ]
            };
            event.waitUntil(
                self.registration.showNotification(data.title || 'Flowwsuite', options)
            );
        } catch (e) {
            console.error('Error parsing push data', e);
            // Fallback for non-JSON push
            event.waitUntil(
                self.registration.showNotification('Flowwsuite', {
                    body: event.data.text(),
                    icon: '/pwa-192x192.png',
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function (clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
