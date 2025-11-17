// PWA Service Worker (v10)
// Isto torna a app "instalável" e permite o funcionamento offline.

const CACHE_NAME = 'assistente-visita-cache-v10';
// A 'URLS_TO_CACHE' deve incluir o caminho exato para o ficheiro no GitHub Pages
const URLS_TO_CACHE = [
  '.',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com' // (v10) Adiciona o Tailwind ao cache
];

// 1. Instalação do Service Worker (Cache dos ficheiros principais)
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, a adicionar ficheiros principais.');
        return cache.addAll(URLS_TO_CACHE).catch(err => {
            console.warn('SW: Falha ao adicionar todos os ficheiros iniciais ao cache. Tentando URLs individuais.', err);
            return Promise.all(
                URLS_TO_CACHE.map(url => cache.add(url).catch(e => console.warn(`SW: Falha ao carregar ${url}`, e)))
            );
        });
      })
      .then(() => self.skipWaiting()) // Ativa o novo SW imediatamente
  );
});

// 2. Ativação (Limpa caches antigos)
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Apaga todos os caches que não sejam o atual
          return cacheName.startsWith('assistente-visita-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Service Worker: A apagar cache antigo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim()) // Controla a página imediatamente
  );
});

// 3. Fetch (Estratégia "Stale-While-Revalidate")
self.addEventListener('fetch', event => {
  // Ignora chamadas para a API do Gemini ou fontes externas
  if (event.request.url.startsWith('http') && !event.request.url.includes('generativelanguage') && !event.request.url.includes('placehold.co')) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // 1. Vai buscar à rede (Stale-While-Revalidate)
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Se a resposta for boa, atualiza o cache
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            console.log('SW: Fetch falhou, a usar o cache se disponível.', err);
            // Se a rede falhar E tivermos algo no cache, retorna o cache
            if(cachedResponse) {
                return cachedResponse;
            }
            // Se falhar e não tiver cache, o browser vai mostrar o erro de offline
          });

          // 2. Retorna o cache imediatamente se disponível,
          // enquanto a rede atualiza em segundo plano.
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});