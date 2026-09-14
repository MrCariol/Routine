// sync.js
// Sincronizzazione online del backup routine (via api/sync.php). L'identita'
// e' sempre quella verificata dall'hub di autenticazione (js/auth.js): qui
// si manda solo il bearer token ottenuto dal login, mai un uuid deciso dal
// client.
//
// Resta distinto dal "server di sincronizzazione" (getServerUrl/setServerUrl
// sotto): quello indica DOVE vive il backend api/sync.php di questa app
// (rilevante per il wrapper nativo Capacitor, che non ha un'origine http
// coincidente con nessun server, o quando frontend e backend sono su domini
// diversi). Il dominio dell'hub di autenticazione (js/auth.js) e' invece
// CHI garantisce l'identita' dell'utente: possono essere lo stesso host o
// due host del tutto diversi.

window.RoutineSync = (function () {
  var LAST_SYNCED_AT_STORAGE = 'routineApp.lastSyncedAt';
  var SERVER_URL_STORAGE = 'routineApp.syncServerUrl';

  // ---- Dominio del server di sincronizzazione (campo libero, opzionale) ----
  // Vuoto di default: in quel caso si usa il path relativo 'api/sync.php',
  // che funziona quando frontend e backend PHP condividono la stessa origine
  // (il deploy web attuale). Va valorizzato quando i due sono su domini
  // diversi o quando l'app gira nel wrapper nativo Capacitor, che non ha
  // un'origine http coincidente con nessun server.
  function getServerUrl() {
    try { return window.localStorage.getItem(SERVER_URL_STORAGE) || ''; } catch (e) { return ''; }
  }
  function setServerUrl(url) {
    try { window.localStorage.setItem(SERVER_URL_STORAGE, url || ''); } catch (e) {}
  }
  function buildApiUrl() {
    var base = getServerUrl().trim();
    if (!base) { return 'api/sync.php'; }
    base = base.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(base)) { base = 'https://' + base; }
    return base + '/api/sync.php';
  }

  function getLastSyncedAt() {
    try {
      var v = window.localStorage.getItem(LAST_SYNCED_AT_STORAGE);
      return v ? parseInt(v, 10) : null;
    } catch (e) { return null; }
  }
  function setLastSyncedAt(ts) {
    try { window.localStorage.setItem(LAST_SYNCED_AT_STORAGE, String(ts)); } catch (e) {}
  }

  // Esegue la chiamata all'endpoint. callback(error, result). Se il token e'
  // scaduto/invalido il server risponde 401: l'errore passato al callback ha
  // in quel caso err.unauthorized = true, cosi' chi chiama puo' disconnettere
  // l'utente (vedi js/app.js).
  function callApi(action, extra, callback) {
    var token = RoutineAuth.getToken();
    if (!token) { callback(new Error('Non hai eseguito l\'accesso')); return; }

    var payload = { action: action, authDomain: RoutineAuth.getHubDomain() };
    if (extra) {
      for (var k in extra) { if (extra.hasOwnProperty(k)) { payload[k] = extra[k]; } }
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', buildApiUrl(), true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status === 401) {
        var unauthorizedErr = new Error('Sessione scaduta: accedi di nuovo');
        unauthorizedErr.unauthorized = true;
        callback(unauthorizedErr);
        return;
      }
      var result;
      try { result = JSON.parse(xhr.responseText); } catch (e) {
        callback(new Error('Risposta non valida dal server'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && result && result.success) {
        callback(null, result);
      } else {
        callback(new Error((result && result.error) || 'Errore dal server'));
      }
    };
    xhr.onerror = function () { callback(new Error('Errore di rete: impossibile contattare il server')); };
    xhr.ontimeout = function () { callback(new Error('Richiesta scaduta: il server non ha risposto in tempo')); };
    try {
      xhr.send(JSON.stringify(payload));
    } catch (e) {
      callback(new Error('Impossibile inviare la richiesta'));
    }
  }

  function pull(callback) {
    callApi('pull', null, callback);
  }
  function push(dataObj, lastModified, callback) {
    callApi('push', { data: dataObj, lastModified: lastModified }, callback);
  }

  return {
    getLastSyncedAt: getLastSyncedAt,
    setLastSyncedAt: setLastSyncedAt,
    getServerUrl: getServerUrl,
    setServerUrl: setServerUrl,
    pull: pull,
    push: push
  };
})();
