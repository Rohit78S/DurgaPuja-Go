// service-worker.js - Enhanced Service Worker with Professional Push Notifications

const CACHE_VERSION = 'v8.2.0-beta';
const STATIC_CACHE = 'kolkata-puja-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'kolkata-puja-dynamic-' + CACHE_VERSION;
const IMAGE_CACHE = 'kolkata-puja-images-' + CACHE_VERSION;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main-app.html',
  '/style.css',
  '/script.js',
  '/update-manager.js',
  '/update-styles.css',
  '/notification-system.js',
  '/push-notifications.js',
  '/notification-styles.css',
  '/manifest.json',
  '/version-check.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
];

const IMAGE_ASSETS = [
  'https://uploads.onecompiler.io/43c8gtkh3/43x6ex7tm/4f69dbc3d7d02b21fb79d7a13e2dec0a.jpg',
  'https://uploads.onecompiler.io/43c8gtkh3/43x5w4zk4/519676966_18011833547766138_7041522230457329894_n.jpg'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache images separately
      caches.open(IMAGE_CACHE).then((cache) => {
        console.log('Caching image assets');
        return cache.addAll(IMAGE_ASSETS);
      })
    ]).then(() => {
      console.log('Service Worker installed successfully');
      return self.skipWaiting();
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== IMAGE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activated successfully');
    })
  );
});

// Fetch event - Implement caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticRequest(request));
  } else if (isAPIRequest(request.url)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Handle image requests - Cache first strategy
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Image request failed:', error);
    return caches.match('/placeholder-image.jpg') || new Response('', { status: 404 });
  }
}

// Handle static asset requests - Cache first strategy
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Static request failed:', error);
    const cache = await caches.open(STATIC_CACHE);
    return cache.match(request) || cache.match('/index.html');
  }
}

// Handle API requests - Network first strategy
async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('API request failed, trying cache:', error);
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This request failed because you are offline'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle dynamic requests - Network first with cache fallback
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Dynamic request failed, trying cache:', error);
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      return caches.match('/main-app.html') || caches.match('/index.html');
    }

    return new Response('Offline', { status: 503 });
  }
}

// Helper functions
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         url.includes('.css') ||
         url.includes('.js') ||
         url.includes('.woff') ||
         url.includes('.woff2');
}

function isAPIRequest(url) {
  return url.includes('/api/') ||
         url.includes('version-check.json') ||
         url.includes('weather') ||
         url.includes('maps.googleapis.com');
}

// ENHANCED PUSH NOTIFICATION HANDLING
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (event.data) {
    try {
      const data = event.data.json();
      event.waitUntil(handlePushNotification(data));
    } catch (error) {
      console.error('Failed to parse push data:', error);
    }
  }
});

async function handlePushNotification(data) {
  const {
    title = 'Durga Puja Guide',
    body = 'New notification',
    icon = '/android-chrome-192x192.png',
    badge = '/android-chrome-96x96.png',
    tag = 'default',
    data: notificationData = {},
    actions = [],
    requireInteraction = false,
    silent = false,
    vibrate = [200, 100, 200]
  } = data;

  // Enhanced notification options
  const options = {
    body,
    icon,
    badge,
    tag,
    data: notificationData,
    actions,
    requireInteraction,
    silent,
    vibrate,
    timestamp: Date.now(),
    // Add image for rich notifications
    image: notificationData.image || null,
    // Add direction for Bengali content
    dir: notificationData.lang === 'bn' ? 'ltr' : 'auto',
    lang: notificationData.lang || 'en'
  };

  // Custom handling based on notification type
  switch (notificationData.type) {
    case 'update':
      options.requireInteraction = true;
      options.actions = [
        { action: 'update', title: 'Update Now', icon: '/icons/update.png' },
        { action: 'dismiss', title: 'Later', icon: '/icons/dismiss.png' }
      ];
      break;

    case 'puja_reminder':
      options.vibrate = [300, 200, 300];
      options.actions = [
        { action: 'view_pandals', title: 'View Pandals', icon: '/icons/pandal.png' },
        { action: 'set_reminder', title: 'Remind Later', icon: '/icons/remind.png' }
      ];
      break;

    case 'gps_tracking':
      options.silent = true;
      options.actions = [
        { action: 'view_route', title: 'View Route', icon: '/icons/map.png' },
        { action: 'stop_tracking', title: 'Stop', icon: '/icons/stop.png' }
      ];
      break;

    case 'emergency':
      options.requireInteraction = true;
      options.vibrate = [500, 200, 500, 200, 500];
      options.actions = [
        { action: 'view_details', title: 'View Details', icon: '/icons/emergency.png' }
      ];
      break;
  }

  try {
    await self.registration.showNotification(title, options);
    console.log('Notification displayed:', title);

    // Track notification display
    await logNotificationEvent('displayed', {
      type: notificationData.type,
      title,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Handle notification clicks with professional routing
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);

  event.notification.close();

  const { action, data } = event.notification;
  const notificationData = event.notification.data || {};

  event.waitUntil(
    handleNotificationClick(action, notificationData)
  );
});

async function handleNotificationClick(action, data) {
  // Log click event
  await logNotificationEvent('clicked', {
    action,
    type: data.type,
    timestamp: Date.now()
  });

  // Get or open client window
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  let client = null;

  // Find existing app window
  for (const c of clients) {
    if (c.url.includes(self.registration.scope)) {
      client = c;
      break;
    }
  }

  const baseUrl = self.registration.scope;
  let targetUrl = baseUrl;

  // Handle different actions
  switch (action) {
    case 'update':
      targetUrl = baseUrl + '?action=update';
      break;

    case 'view_pandals':
      targetUrl = baseUrl + '?section=pandals';
      break;

    case 'view_route':
      targetUrl = baseUrl + '?section=map&action=route';
      break;

    case 'view_weather':
      targetUrl = baseUrl + '?weather=true';
      break;

    case 'view_badges':
      targetUrl = baseUrl + '?section=badges';
      break;

    case 'navigate':
      if (data.pandalId) {
        targetUrl = baseUrl + `?pandal=${data.pandalId}&action=navigate`;
      }
      break;

    case 'bookmark':
      if (data.pandalId) {
        targetUrl = baseUrl + `?pandal=${data.pandalId}&action=bookmark`;
      }
      break;

    case 'stop_tracking':
      targetUrl = baseUrl + '?action=stop_gps';
      break;

    case 'set_reminder':
      targetUrl = baseUrl + '?action=set_reminder&event=' + encodeURIComponent(data.event);
      break;

    case 'view_details':
      if (data.type === 'emergency') {
        targetUrl = baseUrl + '?section=emergency';
      }
      break;

    default:
      // Default action - open main app
      targetUrl = data.url || baseUrl;
  }

  // Focus existing client or open new window
  if (client) {
    await client.navigate(targetUrl);
    return client.focus();
  } else {
    return self.clients.openWindow(targetUrl);
  }
}

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);

  const data = event.notification.data || {};

  event.waitUntil(
    logNotificationEvent('closed', {
      type: data.type,
      tag: event.notification.tag,
      timestamp: Date.now()
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

async function performBackgroundSync() {
  try {
    const pending = await getStoredData('pendingSync') || [];

    for (const item of pending) {
      await fetch(item.url, {
        method: item.method,
        body: item.body,
        headers: item.headers
      });
    }

    await clearStoredData('pendingSync');
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncNotifications() {
  try {
    // Sync notification preferences and scheduled notifications
    const notificationSettings = await getStoredData('notificationSettings');
    const scheduledNotifications = await getStoredData('scheduledNotifications');

    if (notificationSettings) {
      // Apply notification settings
      console.log('Synced notification settings');
    }

    if (scheduledNotifications) {
      // Reschedule notifications
      console.log('Synced scheduled notifications');
    }
  } catch (error) {
    console.error('Notification sync failed:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }

  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    event.waitUntil(scheduleNotification(event.data.data));
  }

  if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
    event.waitUntil(cancelScheduledNotification(event.data.notificationId));
  }
});

// Schedule notification for later delivery
async function scheduleNotification(data) {
  const { scheduledTime, ...notificationData } = data;
  const delay = scheduledTime - Date.now();

  if (delay > 0) {
    setTimeout(async () => {
      await handlePushNotification(notificationData);
    }, delay);

    // Store for persistence across SW restarts
    const scheduled = await getStoredData('scheduledNotifications') || [];
    scheduled.push(data);
    await storeData('scheduledNotifications', scheduled);
  }
}

// Cancel scheduled notification
async function cancelScheduledNotification(notificationId) {
  const scheduled = await getStoredData('scheduledNotifications') || [];
  const filtered = scheduled.filter(n => n.id !== notificationId);
  await storeData('scheduledNotifications', filtered);
}

// Utility functions for logging and storage
async function logNotificationEvent(event, data) {
  try {
    const logs = await getStoredData('notificationLogs') || [];
    logs.push({ event, data, timestamp: Date.now() });

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    await storeData('notificationLogs', logs);
  } catch (error) {
    console.error('Failed to log notification event:', error);
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}

// Helper functions for IndexedDB storage
async function getStoredData(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DurgaPujaApp', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const getRequest = store.get(key);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result?.data);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('storage')) {
        db.createObjectStore('storage', { keyPath: 'key' });
      }
    };
  });
}

async function storeData(key, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DurgaPujaApp', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const putRequest = store.put({ key, data });

      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve();
    };
  });
}

async function clearStoredData(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DurgaPujaApp', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const deleteRequest = store.delete(key);

      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onsuccess = () => resolve();
    };
  });
}

console.log('Enhanced Service Worker with Push Notifications loaded successfully');
