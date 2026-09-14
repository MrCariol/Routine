// auth.js
// Autenticazione tramite un hub esterno (es. MrCariol/auth-hub), il cui
// dominio e' scelto liberamente dall'utente in Impostazioni (vedi
// js/components/settings-page.js) invece di essere fisso nel codice:
// chiunque ospiti un hub compatibile con questo stesso protocollo puo'
// usarlo, non solo un'istanza predefinita.
//
// Flusso (redirect-based, nessun popup, nessuna chiamata diretta di login):
// 1. startLogin() manda il browser su <dominio>/login?client=routine-app
// 2. l'hub fa login (o SSO silenzioso se gia' loggato li') e reindirizza a
//    questa stessa app con "#token=..." nel fragment dell'URL
// 3. consumeCallbackToken(), chiamata nel created() di js/app.js, legge il
//    token dal fragment, lo salva e ripulisce subito l'URL (il token non
//    deve restare in cronologia/referrer)
//
// La validita' del token non viene mai controllata qui: e' js/sync.js,
// parlando con api/sync.php, a scoprire se e' scaduto (risposta 401) e in
// quel caso a richiamare logout(). Lo stesso dominio viene inoltrato dal
// backend per validare il token contro l'hub scelto, vedi il commento in
// api/sync.php per il compromesso di sicurezza che questo comporta.

window.RoutineAuth = (function () {
  var CLIENT_NAME = 'routine-app';

  // accetta sia "dominio.tld" che un URL completo incollato per errore
  // ("https://dominio.tld/qualcosa"): tiene solo l'host, cosi' il resto
  // del codice puo' sempre assumere un dominio nudo
  function normalizeHubDomain(input) {
    var trimmed = (input || '').trim();
    if (!trimmed) { return ''; }
    trimmed = trimmed.replace(/^https?:\/\//i, '');
    trimmed = trimmed.split('/')[0];
    return trimmed;
  }

  function getHubDomain() {
    return Store.loadAuthHubDomain();
  }

  function setHubDomain(domain) {
    Store.saveAuthHubDomain(normalizeHubDomain(domain));
  }

  function startLogin() {
    var domain = getHubDomain();
    if (!domain) { return; }
    window.location.href = 'https://' + domain + '/login?client=' + encodeURIComponent(CLIENT_NAME);
  }

  function consumeCallbackToken() {
    var hash = window.location.hash || '';
    if (hash.indexOf('token=') === -1) { return; }

    // niente URLSearchParams (non su Edge 14/Lumia): match manuale, il
    // token e' l'unico valore che l'hub mette nel fragment
    var match = hash.match(/[#&]token=([^&]+)/);
    var token = match ? decodeURIComponent(match[1]) : null;
    if (token) {
      Store.saveAuthToken(token);
    }

    // ripulisce l'hash dall'URL senza ricaricare la pagina, cosi' il token
    // non resta visibile ne' in cronologia
    var cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', cleanUrl);
  }

  function getToken() {
    return Store.loadAuthToken();
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function logout() {
    Store.clearAuthToken();
  }

  return {
    startLogin: startLogin,
    consumeCallbackToken: consumeCallbackToken,
    getToken: getToken,
    isLoggedIn: isLoggedIn,
    logout: logout,
    getHubDomain: getHubDomain,
    setHubDomain: setHubDomain
  };
})();
