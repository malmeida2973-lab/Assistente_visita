// PWA Service Worker (v11 - Audio Update)
// Atualizado para forçar o download da nova versão da app (v11).

const CACHE_NAME = 'assistente-visita-cache-v11';
const URLS_TO_CACHE = [
  '.',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com'
];

// 1. Instalação: Baixa os arquivos essenciais
self.addEventListener('install', event => {
  console.log('SW: Instalando v11...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Cache aberto. Adicionando arquivos.');
        // Tenta adicionar todos. Se falhar em um, tenta individualmente para garantir que o máximo possível seja salvo.
        return cache.addAll(URLS_TO_CACHE).catch(err => {
            console.warn('SW: Falha no addAll, tentando adicionar individualmente.', err);
            return Promise.all(
                URLS_TO_CACHE.map(url => cache.add(url).catch(e => console.warn(`SW: Falha ao carregar ${url}`, e)))
            );
        });
      })
      .then(() => self.skipWaiting()) // Força o novo SW a ativar imediatamente
  );
});

// 2. Ativação: Limpa caches antigos (v1...v10)
self.addEventListener('activate', event => {
  console.log('SW: Ativando v11...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Apaga qualquer cache que comece com o nosso prefixo mas não seja o v11
          return cacheName.startsWith('assistente-visita-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('SW: Apagando cache antigo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim()) // Toma o controlo de todas as abas abertas imediatamente
  );
});

// 3. Fetch: Intercepta pedidos de rede (Estratégia Stale-While-Revalidate)
self.addEventListener('fetch', event => {
  // Ignora chamadas para APIs externas (como Gemini) ou analytics
  if (event.request.url.startsWith('http') && !event.request.url.includes('generativelanguage') && !event.request.url.includes('placehold.co')) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // Estratégia: 
          // 1. Tenta buscar na rede para ter sempre o conteúdo mais fresco
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Se a rede responder bem, atualiza o cache para a próxima vez
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            // Se a rede falhar (offline), não faz nada (já temos o cachedResponse ou vamos falhar)
            console.log('SW: Rede indisponível, usando cache.', err);
            if (cachedResponse) return cachedResponse;
          });

          // 2. Se tivermos cache, retorna-o IMEDIATAMENTE para performance,
          // enquanto a rede atualiza em segundo plano (se estiver online).
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});