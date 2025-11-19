// PWA Service Worker (v25 - Assistente Externo Update)
const CACHE_NAME = 'assistente-visita-cache-v25'; // <<< ATUALIZADO PARA v25
const URLS_TO_CACHE = [
  '.',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Apaga qualquer cache que comece com o prefixo mas não seja a v25
          return cacheName.startsWith('assistente-visita-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Ignora pedidos para a API da Google ou outras APIs externas
  if (event.request.url.startsWith('http') && !event.request.url.includes('generativelanguage') && !event.request.url.includes('api.groq.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});