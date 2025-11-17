// PWA Service Worker (v9)
// Isto torna a app "instalável" e permite o funcionamento offline.

const CACHE_NAME = 'assistente-visita-cache-v9';
// A 'URLS_TO_CACHE' deve incluir o caminho exato para o ficheiro no GitHub Pages
// Se o seu repositório se chama 'assistente-de-visita', o caminho é '/assistente-de-visita/'
// Se mudou o nome do repositório, tem de mudar aqui.
// Por agora, vamos usar caminhos relativos que funcionam na maioria dos casos.
const URLS_TO_CACHE = [
  '.',
  'index.html',
  'manifest.json'
];

// 1. Instalação do Service Worker (Cache dos ficheiros principais)
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, a adicionar ficheiros principais.');
        // O addAll falhará se um dos ficheiros não for encontrado.
        // É melhor usar add() separadamente para 'index.html' e '.' se houver problemas.
        return cache.addAll(URLS_TO_CACHE).catch(err => {
            console.warn('SW: Falha ao adicionar todos os ficheiros iniciais ao cache. Tentando URLs individuais.', err);
            // Tenta adicionar individualmente
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
// Isto é melhor para uma app que se atualiza.
// Tenta ir à rede primeiro, mas se falhar (offline), usa o cache.
// Ao mesmo tempo, atualiza o cache em segundo plano.
self.addEventListener('fetch', event => {
  // Ignora chamadas para a API do Gemini ou fontes externas como tailwind
  if (event.request.url.startsWith('http') && !event.request.url.includes('generativelanguage') && !event.request.url.includes('cdn.tailwindcss.com') && !event.request.url.includes('placehold.co')) {
    
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