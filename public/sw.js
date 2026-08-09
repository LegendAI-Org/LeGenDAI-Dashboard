// Service worker — the receiving end of the CRM's web push.
//
// Why this file exists: the WhatsApp number behind the dashboard has no handset. A lead's
// message lives only in this app, so without a notification nobody knows it arrived until
// someone happens to open the site. The sender is `tools/push_tools.py` in the CRM repo.
//
// It must sit at the site root (/sw.js) — a service worker can only control pages at or
// below its own path, and one served from a subfolder could not cover /conversations.

self.addEventListener('install', () => {
  // Take over immediately instead of waiting for every tab to close. An old worker
  // lingering after a deploy is how "notifications stopped working" bugs start.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // A push with a non-JSON body still deserves to reach the phone: on Android an
    // undisplayed push counts against the origin and can cost us the permission.
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'הודעה חדשה';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // One notification per lead: a second message from the same person replaces the
    // first rather than stacking, and `renotify` still buzzes the phone.
    tag: data.tag || 'noga',
    renotify: true,
    vibrate: [80, 40, 80],
    dir: 'rtl',
    lang: 'he',
    // במחשב באנר נעלם מעצמו אחרי כמה שניות, ולייה שלא הסתכלה על המסך באותו רגע
    // פשוט מפספסת את הליד. requireInteraction משאיר אותו עד לחיצה. בנייד המערכת
    // מתעלמת מהדגל וההתנהגות נשארת כשהייתה, ולכן זה בטוח לשני העולמות.
    requireInteraction: true,
    data: { url: data.url || '/conversations' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/conversations';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Reuse an open dashboard tab when there is one — opening a second window every
      // time a notification is tapped is how the phone ends up with twelve of them.
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
