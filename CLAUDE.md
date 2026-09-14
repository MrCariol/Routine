# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cos'è

"Le mie Routine": PWA statica (HTML + Vue 2 + jQuery + Bootstrap 4) per gestire routine quotidiane con task cronometrati. Nessun database: tutto vive in `localStorage` del dispositivo. Un unico endpoint PHP opzionale (`api/sync.php`) offre backup/sync online, autenticato tramite un hub esterno (dominio a scelta dell'utente, compatibile con [MrCariol/auth-hub](https://github.com/MrCariol/auth-hub), self-hostabile) — vedi [js/auth.js](js/auth.js).

Progetto pensato per essere self-hostable da chiunque: nessun dominio, hostname o istanza di terzi va mai hardcodato nel codice sorgente. Qualunque valore di questo tipo (dominio del backend, dominio dell'hub di autenticazione, ecc.) va letto da una configurazione scelta dall'utente (localStorage via `Store`, vedi [js/sync.js](js/sync.js) e [js/auth.js](js/auth.js)), mai scritto letteralmente in JS/HTML/PHP.

Il [README.md](README.md) contiene la descrizione dettagliata del modello dati e delle funzionalità (routine/task/subtask, esecuzione, sync, PWA) — consultarlo per il "cosa fa l'app"; questo file si concentra sul "come lavorarci".

## Vincolo architetturale fondamentale: niente build step

- **Nessun bundler/transpiler.** JS e CSS sono file statici caricati via `document.write` da [index.html](index.html), in ordine di dipendenza manuale.
- **Compatibilità dichiarata: EdgeHTML 14 (Windows 10 Mobile / Lumia)** — quindi solo sintassi ES5 in tutto `js/*.js`: niente `const`/`let`, niente arrow function, niente classi, niente template string, niente `Promise` senza feature-detection. Guardare lo stile esistente (`var self = this;`, `function () {}`) prima di scrivere codice nuovo.
- **Cache-busting manuale**: un'unica variabile `APP_VERSION` in cima a [index.html](index.html:34) viene appesa come `?v=...` a tutti i CSS/JS/icone. Dopo qualsiasi modifica a file statici da deployare, **incrementare `APP_VERSION`** — altrimenti i dispositivi (specialmente il service worker, vedi sotto) continuano a servire la versione vecchia.
- Per aggiungere un nuovo file JS: aggiungerlo sia su disco sia come `loadScript('js/...')` in [index.html](index.html:249), rispettando l'ordine (le dipendenze vanno caricate prima di chi le usa).

## Struttura

```
index.html                  entry point; APP_VERSION + caricamento script/css versionati
js/app.js                   istanza Vue root: navigazione a "view" (non router), stato globale
js/store.js                 unico punto di accesso a localStorage (dati, tema, sessione esecuzione, stats, flag)
js/models.js                factory routine/task/subtask, calcolo durate/orari
js/auth.js                  login verso un hub di autenticazione esterno (dominio scelto dall'utente, redirect + token nel fragment URL)
js/sync.js                  client verso api/sync.php (pull/push, identità via js/auth.js)
js/sound.js                 beep via Web Audio API (nessun asset audio)
js/voice.js                 annunci vocali (Web Speech API)
js/notify.js                notifica di sistema in-browser (Notifications API + service worker)
js/icons-data.js            elenco icone MDI selezionabili
js/components/*.js          componenti Vue globali (Vue.component(...)), un file per componente
api/sync.php                endpoint pull/push, valida il token contro l'hub scelto dal client, storage su filesystem in api/data/ (UUID utente come nome file)
sw.js                       service worker: cache-first per asset versionati (?v=...), network-first per il resto
```

Il sito statico servito in produzione è la root del repo (`index.html`, `css/`, `js/`, ecc., via `.htaccess`).

## Pattern dei componenti Vue

Ogni file in `js/components/` registra un componente globale con `Vue.component('nome-kebab-case', {...})`. Il `template` è una **stringa concatenata** (niente Single File Component, niente `<template>` esterni: coerente con l'assenza di build step). Props/eventi seguono il pattern Vue standard (`props`, `$emit`), stato locale in `data()`. Vedi [js/components/color-picker.js](js/components/color-picker.js) come esempio minimo.

Le "pagine" (`routine-editor`, `task-editor`, `execution`, `summary-view`, `settings-page`, `stats-page`) sono anch'esse componenti, montate condizionalmente in [index.html](index.html) tramite `v-if="view === '...'"`; la navigazione tra viste è gestita a mano in [js/app.js](js/app.js) (proprietà `view`), non c'è un router.

## Persistenza (js/store.js)

Tutta la lettura/scrittura di `localStorage` passa da `Store` — non accedere a `window.localStorage` direttamente altrove. Chiavi principali: dati routine (`routineApp.data.v1`), tema, sessione di esecuzione in corso (`routineApp.execution.v1`, per resistere a refresh/chiusura browser), statistiche aggregate per giorno (`routineApp.stats.v1`), token/dominio dell'hub di autenticazione, vari flag on/off. Ogni funzione di `Store` è scritta per fallire in modo silenzioso (try/catch) senza mai perdere i dati esistenti.

## Timer di esecuzione

Il timer in [js/components/execution.js](js/components/execution.js) è basato su **timestamp reali** (delta tra tick), non su un contatore incrementale — deve restare corretto anche se il tab va in background o lo schermo si blocca. Quando si modifica la logica di countdown/overtime, preservare questa proprietà.

## Service worker (sw.js)

Nessuna precache. Strategia per pattern URL: `api/*` sempre e solo rete (mai intercettato, la sync richiede connessione); URL con `?v=...` (asset versionati via `APP_VERSION`) cache-first, perché immutabili per costruzione; tutto il resto (HTML/manifest/icone) network-first con fallback alla cache. `skipWaiting()` + `clients.claim()` fanno prendere il controllo alla nuova versione del service worker immediatamente.

## Autenticazione (js/auth.js) e backend (api/sync.php)

- **Identità delegata a un hub esterno**, mai gestita da quest'app: nessun account/password locali. Il dominio dell'hub è un campo libero in Impostazioni (`Store.loadAuthHubDomain`/`saveAuthHubDomain`), non un default fisso — chiunque può self-hostare un'istanza compatibile con [MrCariol/auth-hub](https://github.com/MrCariol/auth-hub) (login unico, redirect con token Sanctum nel fragment URL, SSO silenzioso via cookie sull'hub). Vedere il `README.md` di quel progetto per il protocollo completo (redirect di login, formato del callback, endpoint `/api/user`).
- **Flusso**: `RoutineAuth.startLogin()` reindirizza a `https://<hubDomain>/login?client=routine-app`; l'hub reindirizza a questa app con `#token=...`; `RoutineAuth.consumeCallbackToken()` (chiamata nel `created()` di [js/app.js](js/app.js), prima di ogni altra cosa) lo legge, lo salva e ripulisce subito l'URL.
- **`api/sync.php`** non valida mai il token da solo: lo inoltra, insieme al dominio hub indicato dal client (campo `authDomain`), a una chiamata server-to-server verso `https://<authDomain>/api/user`. È l'hub a rispondere con l'utente proprietario del token (mai un uuid fidato ciecamente dal client). Il backup è salvato in `api/data/<uuid>.json`. Serve `api/.htaccess` (inoltra l'header `Authorization` su hosting PHP-CGI/FastCGI) perché l'endpoint autentica ogni richiesta con quell'header.
- Endpoint singolo, solo POST JSON, azioni `pull`/`push`. Limite payload 2 MB. `api/data/` è protetta da `.htaccess` (accesso diretto negato). Nessuna cifratura a riposo: i backup sono in chiaro sul filesystem.
- Distinguere sempre due domini concettualmente diversi, entrambi configurabili dall'utente e potenzialmente diversi tra loro: il **server di sincronizzazione** (`RoutineSync.getServerUrl`/`setServerUrl`, dove vive `api/sync.php`) e l'**hub di autenticazione** (`RoutineAuth.getHubDomain`/`setHubDomain`, chi garantisce l'identità).

## Deploy

`.github/workflows/deploy.yml` — ad ogni push su `main`, carica via FTP/FTPS (curl) tutti i file tracciati da git (esclusi `.github/`, `.gitignore`, `README.md`, `CLAUDE.md`), nella cartella indicata da `FTP_REMOTE_DIR`. Nessun build, nessuna estrazione lato server: essendo un sito statico + un unico PHP, basta l'upload diretto. Non cancella mai file sul server (solo upload/overwrite) — in particolare non tocca mai `api/data/*.json` (i backup degli utenti), che non essendo tracciati da git non compaiono mai nell'elenco caricato.

Un solo secret richiesto (repo GitHub → Settings → Secrets and variables → Actions): **`FTP_CONFIG`**, con tutti i parametri dentro, una riga per campo in formato `CHIAVE=valore`:
```
FTP_HOST=ftp.tuodominio.it
FTP_USER=utente
FTP_PASS=password
FTP_REMOTE_DIR=/percorso/sul/server
FTP_SECURE=true
```
`FTP_HOST`/`FTP_USER`/`FTP_PASS` obbligatori; `FTP_REMOTE_DIR` opzionale (vuoto = root FTP); `FTP_SECURE` opzionale (`true` = FTPS esplicita, default; `false` = FTP in chiaro, solo se l'host non la supporta). Il workflow maschera a mano i valori estratti nei log (GitHub maschera automaticamente solo l'intero blob del secret, non le singole righe).

## Sviluppo locale

Server PHP locale già configurato in [.claude/launch.json](.claude/launch.json) (`php -S localhost:8090 -t .`) — necessario per testare la sync, non solo per servire i file statici. Non essendoci build step, per il solo frontend basta aprire `index.html` o servire la root con qualunque server statico.

Nessun linter, formatter o test automatizzato configurato — non cercarne uno. La verifica è manuale: aprire l'app nel browser (o `php -S`) ed esercitare il flusso toccato.

## Convenzioni

- Commenti e messaggi rivolti all'utente in italiano; identificatori di codice in inglese/kebab-case per i nomi dei componenti Vue.
- Modali di conferma custom al posto di `window.confirm` (vedi `askConfirm`/`runConfirmedAction` in [js/app.js](js/app.js)) — riusare quel meccanismo condiviso invece di introdurne un altro.
- Quando si tocca `Store`, mantenere la garanzia di non-perdita-dati (try/catch attorno a ogni accesso a `localStorage`, fallback a default sensati).
