// store.js
// Livello di persistenza dell'app. Tutti i dati vivono SOLO in localStorage
// del dispositivo. Ogni funzione qui dentro è scritta per fallire in modo
// "silenzioso e sicuro" (non deve mai perdere i dati esistenti se qualcosa va storto).

var STORAGE_KEY = 'routineApp.data.v1';
var THEME_KEY = 'routineApp.theme';
var EXEC_KEY = 'routineApp.execution.v1';
var LOCAL_MODIFIED_KEY = 'routineApp.localModified';
var INSTALL_PROMO_KEY = 'routineApp.installPromoSeen';
var VOICE_KEY = 'routineApp.voiceEnabled';
var NOTIFY_KEY = 'routineApp.notifyEnabled';
var STATS_KEY = 'routineApp.stats.v1';
var STATS_RETENTION_DAYS = 730;

// 16 colori pensati per restare leggibili sia su tema chiaro che scuro
var ICON_COLORS = [
  { name: 'Rosso', hex: '#E74C3C' },
  { name: 'Arancione', hex: '#E67E22' },
  { name: 'Ambra', hex: '#F39C12' },
  { name: 'Giallo', hex: '#F1C40F' },
  { name: 'Lime', hex: '#A9C93D' },
  { name: 'Verde', hex: '#2ECC71' },
  { name: 'Smeraldo', hex: '#16A085' },
  { name: 'Turchese', hex: '#1ABC9C' },
  { name: 'Ciano', hex: '#17A2B8' },
  { name: 'Azzurro', hex: '#3498DB' },
  { name: 'Blu', hex: '#4B6BE0' },
  { name: 'Indaco', hex: '#6C63C6' },
  { name: 'Viola', hex: '#9B59B6' },
  { name: 'Magenta', hex: '#E84393' },
  { name: 'Rosa', hex: '#FF6B9D' },
  { name: 'Grigio ardesia', hex: '#7F8C9A' }
];

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

function nowHHMM() {
  var d = new Date();
  var h = d.getHours() < 10 ? '0' + d.getHours() : '' + d.getHours();
  var m = d.getMinutes() < 10 ? '0' + d.getMinutes() : '' + d.getMinutes();
  return h + ':' + m;
}

function defaultData() {
  return { routines: [] };
}

function defaultStats() {
  return { routines: {} };
}

function todayDateStr() {
  var d = new Date();
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

var Store = {

  ICON_COLORS: ICON_COLORS,

  uid: uid,

  // ---- Lettura / scrittura dati principali -----------------------------
  load: function () {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) { return defaultData(); }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.routines) { return defaultData(); }
      return parsed;
    } catch (e) {
      console.error('Errore lettura dati, uso dataset vuoto per non bloccare l\'app', e);
      return defaultData();
    }
  },

  save: function (data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Errore salvataggio dati (memoria piena o non disponibile)', e);
      return false;
    }
  },

  // ---- Tema --------------------------------------------------------------
  loadTheme: function () {
    try {
      return window.localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) { return 'light'; }
  },

  saveTheme: function (theme) {
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  },

  // ---- Sessione di esecuzione in corso (per sopravvivere a refresh) -----
  loadExecution: function () {
    try {
      var raw = window.localStorage.getItem(EXEC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  saveExecution: function (state) {
    try {
      if (!state) {
        window.localStorage.removeItem(EXEC_KEY);
      } else {
        window.localStorage.setItem(EXEC_KEY, JSON.stringify(state));
      }
    } catch (e) {}
  },

  // ---- Export / Import per backup manuale --------------------------------
  exportJSON: function (data) {
    var payload = {
      app: 'routine-app',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: data
    };
    return JSON.stringify(payload, null, 2);
  },

  parseImport: function (text) {
    var parsed = JSON.parse(text);
    if (parsed && parsed.data && parsed.data.routines) { return parsed.data; }
    if (parsed && parsed.routines) { return parsed; } // tollera un file "grezzo"
    throw new Error('Formato file non riconosciuto');
  },

  // ---- Traccia "ultima modifica locale" (per la sincronizzazione) --------
  // Salvata come chiave separata, MAI come proprieta' dell'oggetto dati
  // reattivo: se la mettessimo li' dentro, ogni suo aggiornamento
  // scatenerebbe di nuovo il watcher che l'ha appena scritta, creando un
  // ciclo infinito di salvataggi.
  touchLocalModified: function () {
    try { window.localStorage.setItem(LOCAL_MODIFIED_KEY, String(Date.now())); } catch (e) {}
  },
  getLocalModified: function () {
    try {
      var v = window.localStorage.getItem(LOCAL_MODIFIED_KEY);
      return v ? parseInt(v, 10) : 0;
    } catch (e) { return 0; }
  },

  // ---- Popup di invito all'installazione PWA (mostrato una sola volta) --
  hasSeenInstallPromo: function () {
    try { return window.localStorage.getItem(INSTALL_PROMO_KEY) === '1'; } catch (e) { return false; }
  },
  markInstallPromoSeen: function () {
    try { window.localStorage.setItem(INSTALL_PROMO_KEY, '1'); } catch (e) {}
  },

  // ---- Annunci vocali (impostazione globale) ------------------------------
  loadVoiceEnabled: function () {
    try {
      var v = window.localStorage.getItem(VOICE_KEY);
      return v === null ? true : v === '1';
    } catch (e) { return true; }
  },
  saveVoiceEnabled: function (enabled) {
    try { window.localStorage.setItem(VOICE_KEY, enabled ? '1' : '0'); } catch (e) {}
  },

  // ---- Notifica di sistema durante l'esecuzione (opt-in, richiede permesso) --
  loadNotifyEnabled: function () {
    try { return window.localStorage.getItem(NOTIFY_KEY) === '1'; } catch (e) { return false; }
  },
  saveNotifyEnabled: function (enabled) {
    try { window.localStorage.setItem(NOTIFY_KEY, enabled ? '1' : '0'); } catch (e) {}
  },

  // ---- Statistiche esecuzioni, aggregate per giorno -----------------------
  // Una routine e' pensata per essere svolta una volta al giorno: se viene
  // svolta piu' volte lo stesso giorno i tempi si sommano nella entry di
  // quel giorno, invece di tenere un log per singola esecuzione.
  todayDateStr: todayDateStr,

  loadStats: function () {
    try {
      var raw = window.localStorage.getItem(STATS_KEY);
      if (!raw) { return defaultStats(); }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.routines) { return defaultStats(); }
      return parsed;
    } catch (e) { return defaultStats(); }
  },

  saveStats: function (stats) {
    try {
      window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
      return true;
    } catch (e) { return false; }
  },

  // Registra un'esecuzione (completata o interrotta) di una routine.
  // tasks: array di { id, name, status ('completed'|'skipped'|'pending'),
  // elapsedSeconds, totalSeconds }. Il tempo dei task saltati viene
  // ignorato; i task mai raggiunti (status 'pending') non contano ne'
  // come completati ne' come saltati.
  recordExecution: function (routineId, routineName, tasks) {
    var hasCompleted = tasks.some(function (t) { return t.status === 'completed'; });
    if (!hasCompleted) { return; }

    var stats = this.loadStats();
    var dateStr = todayDateStr();

    if (!stats.routines[routineId]) { stats.routines[routineId] = { name: routineName, days: {} }; }
    var routineStats = stats.routines[routineId];
    routineStats.name = routineName;

    if (!routineStats.days[dateStr]) { routineStats.days[dateStr] = { totalSeconds: 0, executionsCount: 0, tasks: {} }; }
    var day = routineStats.days[dateStr];
    day.executionsCount += 1;

    tasks.forEach(function (t) {
      if (t.status !== 'completed' && t.status !== 'skipped') { return; }
      if (!day.tasks[t.id]) {
        day.tasks[t.id] = { name: t.name, completedSeconds: 0, completedCount: 0, estimatedSecondsSum: 0, skippedCount: 0 };
      }
      var taskStats = day.tasks[t.id];
      taskStats.name = t.name;
      if (t.status === 'completed') {
        day.totalSeconds += t.elapsedSeconds;
        taskStats.completedSeconds += t.elapsedSeconds;
        taskStats.completedCount += 1;
        taskStats.estimatedSecondsSum += (t.totalSeconds || 0);
      } else {
        taskStats.skippedCount += 1;
      }
    });

    // Limita la crescita nel tempo: scarta i giorni troppo vecchi.
    var cutoff = Date.now() - STATS_RETENTION_DAYS * 86400000;
    Object.keys(routineStats.days).forEach(function (d) {
      if (new Date(d).getTime() < cutoff) { delete routineStats.days[d]; }
    });

    this.saveStats(stats);
  },

  // ---- Utility tempo -------------------------------------------------------
  nowHHMM: nowHHMM,

  minutesToHHMM: function (totalMinutes) {
    var m = ((totalMinutes % 1440) + 1440) % 1440; // gestisce overflow/negativi sulle 24h
    var h = Math.floor(m / 60);
    var mm = Math.floor(m % 60);
    var hh = h < 10 ? '0' + h : '' + h;
    var mmS = mm < 10 ? '0' + mm : '' + mm;
    return hh + ':' + mmS;
  },

  hhmmToMinutes: function (hhmm) {
    if (!hhmm) { return null; }
    var parts = hhmm.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  },

  formatDuration: function (totalSeconds) {
    totalSeconds = Math.max(0, Math.round(totalSeconds));
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    var out = '';
    if (h > 0) { out += h + ' h '; }
    if (m > 0 || h > 0) { out += m + ' min '; }
    out += s + ' s';
    return out;
  },

  formatDateTime: function (ts) {
    if (!ts) { return 'sconosciuta'; }
    var d = new Date(ts);
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  },

  formatClock: function (totalSeconds) {
    totalSeconds = Math.max(0, Math.round(totalSeconds));
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    var mm = m < 10 ? '0' + m : '' + m;
    var ss = s < 10 ? '0' + s : '' + s;
    if (h > 0) {
      var hh = h < 10 ? '0' + h : '' + h;
      return hh + ':' + mm + ':' + ss;
    }
    return mm + ':' + ss;
  }
};
