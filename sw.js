/*
  Service worker per il funzionamento offline dell'app (offline-first).

  Strategia, nessuna precache (la cache si riempie al volo, al primo uso
  online, cosi' non serve mantenere un elenco file separato da tenere
  sincronizzato con index.html):

  - Richieste verso api/ (sincronizzazione col server): MAI intercettate,
    sempre e solo rete, nessun fallback offline. La sincronizzazione
    richiede connessione per definizione.
  - Risorse con "?v=..." nell'URL (CSS/JS versionati tramite APP_VERSION,
    vedi index.html): cache-first. Sono immutabili per costruzione, l'URL
    cambia ad ogni versione, quindi non c'e' rischio di restare bloccati
    su contenuto vecchio.
  - Tutto il resto (index.html, manifest.json, icone): network-first con
    fallback alla cache, bypassando anche la cache HTTP del browser. Cosi',
    quando c'e' connessione, si vede sempre la versione piu' recente
    (aggiornamenti presi subito); offline, si vede l'ultima nota.

  Aggiornamento del service worker stesso: skipWaiting()+clients.claim()
  fanno si' che una nuova versione di questo file prenda il controllo
  subito al prossimo caricamento, invece di restare "in attesa" che tutte
  le schede con la versione vecchia vengano chiuse.
*/

var CACHE_NAME = 'routine-app-runtime-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') { return; }

  var url = new URL(request.url);
  if (url.pathname.indexOf('/api/') !== -1) { return; }

  if (url.searchParams.has('v')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) { return cached; }
      return fetch(request).then(function (response) {
        if (response && response.ok) { cache.put(request, response.clone()); }
        return response;
      });
    });
  });
}

function networkFirst(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return fetch(request, { cache: 'no-store' }).then(function (response) {
      if (response && response.ok) { cache.put(request, response.clone()); }
      return response;
    }).catch(function () {
      return cache.match(request).then(function (cached) {
        if (cached) { return cached; }
        throw new Error('Offline e nessuna copia in cache per ' + request.url);
      });
    });
  });
}
