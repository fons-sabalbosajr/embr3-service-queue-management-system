self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const now = Date.now();
  if (payload.expiresAt && now > payload.expiresAt) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Queue update', {
      body: payload.body || 'Your queue status has changed.',
      icon: '/emblogo.svg',
      badge: '/emblogo.svg',
      tag: payload.tag || 'sqms-queue-alert',
      renotify: true,
      vibrate: payload.vibrate || [250, 120, 250],
      data: {
        url: payload.url || '/check-my-queue',
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/check-my-queue';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes('/check-my-queue')) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});