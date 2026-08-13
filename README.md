# Le mie Routine

Web app (PWA) per la gestione di routine quotidiane con task cronometrati. Frontend statico + un endpoint PHP opzionale per il backup online.

## Stack tecnico

- HTML + Vue 2 (`vue.min.js`), jQuery, Bootstrap 4 (bundle JS incluso)
- Material Design Icons (font incluso, dataset icone in `js/icons-data.js`)
- `nosleep.min.js` per impedire lo spegnimento schermo durante l'esecuzione
- Nessun build step: JS caricato come script separati via `document.write` con cache-busting manuale (`APP_VERSION` in `index.html`)
- Persistenza principale: `localStorage` del dispositivo (nessun database lato client)
- Backend: un unico endpoint PHP (`api/sync.php`) per sync/backup opzionale, con storage su file system
- Manifest PWA configurato per l'host `ciccioneissima.altervista.org`
- Target dichiarato in `index.html`: compatibilità con EdgeHTML 14 (Windows 10 Mobile / Lumia), confermato anche nei commenti di `.htaccess`

## Struttura file

```
index.html                  entry point, carica CSS/JS con ?v=APP_VERSION
manifest.json                manifest PWA
browserconfig.xml            config tile Windows
.htaccess                    regole cache Apache
css/                         Bootstrap (light/dark) + MDI + override tema scuro
fonts/                       font MDI
icons/                       icone app (favicon, touch icon, tile)
js/app.js                    istanza Vue root, navigazione, sync, import/export
js/models.js                 factory routine/task/subtask, calcolo durate e orari
js/store.js                  persistenza localStorage, formattazione tempo, palette colori
js/sync.js                   client sync verso api/sync.php (passphrase-based)
js/sync-wordlist.js           wordlist per generare passphrase
js/sound.js                   beep via Web Audio API (nessun file audio)
js/icons-data.js              elenco icone MDI selezionabili
js/components/*.js            componenti Vue (una vista/funzione ciascuno)
api/sync.php                  endpoint pull/push backup
api/data/                     backup salvati (uno per passphrase, hash SHA-256 come nome file)
```

## Modello dati

- **Routine**: `id, name, timeMode (none|start|end), timeValue, tasks[]`
- **Task**: `id, name, icon, color, hours, minutes, seconds, description, subtasks[], autoComplete`
- **Subtask**: `id, name`

Tutto salvato in `localStorage` sotto la chiave `routineApp.data.v1` come `{ routines: [...] }`.

## Funzionalità

### Gestione routine
- Creazione/modifica/eliminazione routine ed elenco task associato
- Riordino task (su/giù)
- Orario di riferimento opzionale: nessuno, orario di inizio o orario di fine; l'altro estremo viene calcolato automaticamente sommando/sottraendo la durata totale dei task
- Validazione minima: nome non vuoto e almeno un task per poter salvare/avviare

### Gestione task
- Nome, icona (picker con ricerca su ~centinaia di icone MDI), colore (palette di 16 colori predefiniti)
- Durata impostabile in ore/minuti/secondi tramite picker a pulsanti (+1/+10/-1/-10)
- Descrizione facoltativa
- Sotto-task (semplice lista di nomi, spuntabili durante l'esecuzione, riordinabili)
- Opzione "completa automaticamente" allo scadere del tempo (default: manuale)

### Esecuzione routine
- Vista dedicata con timer per il task corrente (cerchio di progresso SVG)
- Countdown che, superato lo zero, passa in overtime mostrando il tempo in eccesso (in rosso)
- Segnali acustici (beep generati via Web Audio, non file audio) a soglie: 5 min, 2 min, 1 min, allo scadere, e ogni minuto in overtime
- Pulsanti: indietro, pausa, completa, salta
- Regolazione al volo della durata del task corrente (±1/±5 minuti)
- Calcolo e mostra in tempo reale l'orario di fine task corrente e l'orario di fine dell'intera routine
- Sessione di esecuzione persistita in `localStorage` (`routineApp.execution.v1`): un refresh o la chiusura del browser non fa perdere i progressi, l'app riprende da dove era
- Timer basato su timestamp reali (delta tra tick), non su un semplice contatore, per restare corretto anche se il browser va in background o lo schermo si blocca
- `NoSleep.js` attivato durante l'esecuzione per impedire lo spegnimento schermo
- Riepilogo finale con stato di ogni task (completato/saltato) e tempo effettivo impiegato

### Backup e sincronizzazione
- **Export/Import manuale**: scarica/carica un file JSON con tutte le routine (l'import sovrascrive tutto, con conferma)
- **Sync online opzionale**: basata su una passphrase generata (5 parole da una wordlist) o scelta dall'utente, senza account
  - La passphrase viene hashata (SHA-256) lato server e usata come nome file; non è vera autenticazione, chi conosce la passphrase ha accesso completo a quel backup
  - Un solo backup per passphrase, sempre sovrascritto (nessuno storico/versioning)
  - Alla sincronizzazione manuale, se locale e server differiscono, l'utente sceglie quale versione tenere (sovrascrive l'altra)
  - Controllo silenzioso all'avvio dell'app: colora l'icona di sync (verde se allineato, giallo se ci sono differenze) senza notifiche invasive
  - `api/data/` è protetta da `.htaccess` (accesso diretto negato, solo lo script PHP può leggerla/scriverla)

### Altro
- Tema chiaro/scuro, persistito e applicato cambiando il foglio di stile Bootstrap caricato
- Modali di conferma personalizzate al posto di `window.confirm`
- Cache-busting manuale via singola variabile `APP_VERSION` in `index.html`
- PWA installabile (manifest + icone), pensata anche per dispositivi datati (Windows 10 Mobile/Edge, da cui il vincolo di compatibilità ES5 e l'assenza di build tool)
- Funzionamento offline (service worker `sw.js`, runtime caching): tutte le funzionalità eccetto la sincronizzazione online funzionano senza connessione; quando torna la rete, HTML/manifest/icone vengono ricontrollati subito (network-first), mentre CSS/JS/font versionati (`?v=...`) restano cache-first perché immutabili per costruzione

## Note di sicurezza rilevanti

- La sincronizzazione non ha un vero controllo d'accesso: è "security through obscurity" basata sulla segretezza della passphrase (min. 8 caratteri lato server, nessun limite di tentativi/rate-limiting sull'endpoint)
- Limite dimensione payload: 2 MB per richiesta
- Nessuna cifratura dei dati salvati sul server: il backup è in chiaro sul filesystem
