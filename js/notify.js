// notify.js
// Notifica di sistema durante l'esecuzione di una routine, tramite la
// Notifications API + Service Worker (unico modo per farla comparire anche
// se il browser e' in background). Stesso approccio di sound.js/voice.js:
// modulo standalone, feature-detection, no-op silenzioso se non disponibile.
//
// Limite importante, non aggirabile lato web: NON e' un countdown live che
// ticchetta al secondo (il browser sospende il JS in background per
// risparmiare batteria, non esiste un'API per "svegliarsi" ogni secondo).
// Per questo il testo mostra l'orario FISSO di fine task, non un "mancano
// X minuti" che diventerebbe falso se l'aggiornamento successivo salta.

window.RoutineNotify = (function () {
  var TAG = 'routine-execution';

  function supported() {
    return ('Notification' in window) && ('serviceWorker' in navigator);
  }

  function permission() {
    return supported() ? Notification.permission : 'unsupported';
  }

  // Da chiamare solo durante un vero tocco dell'utente (es. toggle nelle
  // Impostazioni): i browser richiedono un gesto reale per il prompt.
  function requestPermission(callback) {
    if (!supported()) { callback(false); return; }
    if (Notification.permission === 'granted') { callback(true); return; }
    if (Notification.permission === 'denied') { callback(false); return; }
    try {
      Notification.requestPermission().then(function (perm) {
        callback(perm === 'granted');
      });
    } catch (e) { callback(false); }
  }

  function show(title, body) {
    if (!supported() || Notification.permission !== 'granted') { return; }
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.showNotification(title, {
        body: body,
        tag: TAG,
        renotify: false,
        requireInteraction: true,
        icon: 'icons/icon-192-v2.png',
        badge: 'icons/icon-192-v2.png'
      });
    }).catch(function () {});
  }

  function close() {
    if (!supported()) { return; }
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.getNotifications({ tag: TAG }).then(function (list) {
        list.forEach(function (n) { n.close(); });
      });
    }).catch(function () {});
  }

  return {
    supported: supported,
    permission: permission,
    requestPermission: requestPermission,
    show: show,
    close: close
  };
})();
