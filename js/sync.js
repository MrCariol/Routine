// sync.js
// Gestisce la passphrase di sincronizzazione e la comunicazione con
// l'endpoint api/sync.php. Nessuna vera autenticazione: la passphrase
// stessa e' la "chiave" (chi la conosce puo' leggere/scrivere quel backup).

window.RoutineSync = (function () {
  var KEY_STORAGE = 'routineApp.syncPassphrase';
  var LAST_SYNCED_AT_STORAGE = 'routineApp.lastSyncedAt';
  var SERVER_URL_STORAGE = 'routineApp.syncServerUrl';
  var WORDS_COUNT = 5;

  function getPassphrase() {
    try { return window.localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { return ''; }
  }
  function setPassphrase(p) {
    try { window.localStorage.setItem(KEY_STORAGE, p); } catch (e) {}
  }
  function clearPassphrase() {
    try { window.localStorage.removeItem(KEY_STORAGE); } catch (e) {}
  }
  function hasPassphrase() {
    return getPassphrase().length > 0;
  }

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

  function secureRandomIndex(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      var arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function generatePassphrase() {
    var list = window.SYNC_WORDLIST || [];
    if (list.length === 0) { return ''; }
    var words = [];
    for (var i = 0; i < WORDS_COUNT; i++) {
      words.push(list[secureRandomIndex(list.length)]);
    }
    return words.join('-');
  }

  // Esegue la chiamata all'endpoint. callback(error, result)
  function callApi(action, extra, callback) {
    var passphrase = getPassphrase();
    if (!passphrase) { callback(new Error('Nessuna chiave di sincronizzazione configurata')); return; }

    var payload = { action: action, passphrase: passphrase };
    if (extra) {
      for (var k in extra) { if (extra.hasOwnProperty(k)) { payload[k] = extra[k]; } }
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', buildApiUrl(), true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;
    xhr.onload = function () {
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
    getPassphrase: getPassphrase,
    setPassphrase: setPassphrase,
    clearPassphrase: clearPassphrase,
    hasPassphrase: hasPassphrase,
    getLastSyncedAt: getLastSyncedAt,
    setLastSyncedAt: setLastSyncedAt,
    getServerUrl: getServerUrl,
    setServerUrl: setServerUrl,
    generatePassphrase: generatePassphrase,
    pull: pull,
    push: push
  };
})();
