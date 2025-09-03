// KSYK Navigator Service Worker - Advanced PWA Capabilities
const CACHE_NAME = 'ksyk-navigator-v1.0.0';
const STATIC_CACHE_NAME = 'ksyk-static-v1';
const DYNAMIC_CACHE_NAME = 'ksyk-dynamic-v1';

// Cache strategies for different resource types
const CACHE_STRATEGIES = {
  static: ['/', '/index.html', '/manifest.json'],
  api: ['/api/buildings', '/api/rooms', '/api/staff'],
  assets: ['/icons/', '/screenshots/', '/fonts/']
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(CACHE_STRATEGIES.static);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Force activation
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different resource types
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else if (url.pathname.includes('/icons/') || url.pathname.includes('/screenshots/')) {
    // Static assets - Cache First
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // HTML pages - Stale While Revalidate
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Network First Strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API requests
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This feature requires an internet connection',
          cached: false
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch asset:', request.url, error);
    throw error;
  }
}

// Stale While Revalidate Strategy (for HTML pages)
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE_NAME);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => cachedResponse); // Fallback to cache on network error
  
  return cachedResponse || fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'room-search') {
    event.waitUntil(syncRoomSearches());
  } else if (event.tag === 'navigation-tracking') {
    event.waitUntil(syncNavigationData());
  }
});

// Sync offline room searches
async function syncRoomSearches() {
  try {
    const offlineSearches = await getStoredSearches();
    
    for (const search of offlineSearches) {
      try {
        await fetch('/api/analytics/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(search)
        });
      } catch (error) {
        console.error('[SW] Failed to sync search:', error);
      }
    }
    
    await clearStoredSearches();
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync offline navigation data
async function syncNavigationData() {
  try {
    const offlineNavigation = await getStoredNavigation();
    
    for (const nav of offlineNavigation) {
      try {
        await fetch('/api/analytics/navigation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nav)
        });
      } catch (error) {
        console.error('[SW] Failed to sync navigation:', error);
      }
    }
    
    await clearStoredNavigation();
  } catch (error) {
    console.error('[SW] Navigation sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'New update available for KSYK Navigator',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };
  
  if (event.data) {
    const pushData = event.data.json();
    options.body = pushData.message || options.body;
    options.data.url = pushData.url || options.data.url;
  }
  
  event.waitUntil(
    self.registration.showNotification('KSYK Navigator', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window if app not open
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_ROOM_DATA') {
    cacheRoomData(event.data.data);
  } else if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ cacheSize: size });
    });
  }
});

// Cache room data for offline use
async function cacheRoomData(roomData) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = new Response(JSON.stringify(roomData), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put('/api/rooms/offline', response);
    console.log('[SW] Room data cached for offline use');
  } catch (error) {
    console.error('[SW] Failed to cache room data:', error);
  }
}

// Get total cache size
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
    
    return formatBytes(totalSize);
  } catch (error) {
    console.error('[SW] Failed to calculate cache size:', error);
    return 'Unknown';
  }
}

// Format bytes for display
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper functions for IndexedDB operations
async function getStoredSearches() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ksyk-offline', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['searches'], 'readonly');
      const store = transaction.objectStore('searches');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result || []);
    };
    request.onerror = () => resolve([]);
  });
}

async function getStoredNavigation() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ksyk-offline', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['navigation'], 'readonly');
      const store = transaction.objectStore('navigation');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result || []);
    };
    request.onerror = () => resolve([]);
  });
}

async function clearStoredSearches() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ksyk-offline', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['searches'], 'readwrite');
      const store = transaction.objectStore('searches');
      store.clear();
      transaction.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}

async function clearStoredNavigation() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ksyk-offline', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['navigation'], 'readwrite');
      const store = transaction.objectStore('navigation');
      store.clear();
      transaction.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}

console.log('[SW] Service Worker loaded successfully');