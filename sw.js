/*
  Service worker minimale.
  Non fa caching: l'app gestisce già l'aggiornamento dei file tramite
  cache-busting manuale (APP_VERSION in index.html), quindi qui NON viene
  intercettata/salvata alcuna risposta, per non creare doppioni o conflitti
  con quel meccanismo. Esiste solo perché Chrome (e altri browser Chromium)
  richiedono un service worker con un listener "fetch" registrato perché il
  sito sia considerato installabile come PWA (criterio non soddisfatto da
  EdgeHTML 14, che infatti ignora questo file: vedi il registration guard in
  index.html).
*/

self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
});
