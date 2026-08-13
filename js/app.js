// app.js - istanza Vue radice dell'applicazione

window.appNoSleep = null;
try { window.appNoSleep = new NoSleep(); } catch (e) { console.warn('NoSleep non disponibile', e); }

var app = new Vue({
  el: '#app',
  data: {
    data: Store.load(),
    theme: Store.loadTheme(),
    voiceEnabled: Store.loadVoiceEnabled(),
    notifyEnabled: Store.loadNotifyEnabled(),
    importError: '',
    importSuccess: '',

    // Navigazione a schermate separate (routine/task/esecuzione/riepilogo)
    view: 'home', // 'home' | 'settings' | 'stats' | 'routine-edit' | 'task-edit' | 'execution' | 'summary'
    currentRoutineDraft: null,
    editingRoutineIndex: null,
    isRoutineNew: true,
    currentTaskDraft: null,
    editingTaskIndex: null,
    isTaskNew: true,
    routineToExecute: null,
    resumeExecutionSession: null,
    routineSummaryPayload: null,

    // Sincronizzazione online
    syncButtonState: 'neutral', // 'neutral' | 'checking' | 'ok' | 'warning'
    syncBusy: false,
    syncInfoMessage: '',
    syncInfoIsError: false,
    syncConflict: null, // { localModified, localCount, serverModified, serverCount, serverData }

    // Installazione PWA (bottone "Installa l'app" in home)
    deferredInstallPrompt: null,
    canInstall: false,

    // Modale di conferma condivisa (sostituisce window.confirm)
    confirmMessage: '',
    confirmPendingAction: null
  },
  computed: {
    routines: function () { return this.data.routines; },
    // 'local' | 'server' | null (null se non determinabile o a pari data)
    syncConflictNewer: function () {
      if (!this.syncConflict) { return null; }
      var l = this.syncConflict.localModified || 0;
      var s = this.syncConflict.serverModified || 0;
      if (!l && !s) { return null; }
      if (l === s) { return null; }
      return l > s ? 'local' : 'server';
    }
  },
  watch: {
    data: {
      deep: true,
      handler: function (val) {
        Store.save(val);
        Store.touchLocalModified();
      }
    },
    // Essendo una SPA, cambiare "pagina" non ricarica il documento: senza
    // questo reset, la nuova pagina erediterebbe la posizione di scroll
    // lasciata da quella precedente (a volte a meta' o in fondo).
    view: function () {
      var self = this;
      this.$nextTick(function () { self.scrollToTop(); });
    },
    // Popup di invito all'installazione: mostrato una sola volta nella vita
    // dell'app (vedi Store.hasSeenInstallPromo/markInstallPromoSeen), solo
    // quando il browser segnala davvero che l'installazione e' disponibile
    // (mai su EdgeHTML 14) e solo se l'utente e' in home in quel momento
    // (per non interromperlo mentre sta modificando qualcosa).
    canInstall: function (val) {
      if (!val || this.view !== 'home' || Store.hasSeenInstallPromo()) { return; }
      Store.markInstallPromoSeen();
      var self = this;
      this.$nextTick(function () { $(self.$refs.installPromoModal).modal('show'); });
    }
  },
  methods: {
    scrollToTop: function () {
      // window.scrollTo basta sui browser moderni, ma su EdgeHTML e vecchie
      // versioni e' piu' sicuro azzerare anche html/body direttamente.
      try { window.scrollTo(0, 0); } catch (e) {}
      if (document.documentElement) { document.documentElement.scrollTop = 0; }
      if (document.body) { document.body.scrollTop = 0; }
    },
    applyTheme: function () {
      var link = document.getElementById('theme-stylesheet');
      var base = this.theme === 'dark' ? 'css/bootstrap-dark.min.css' : 'css/bootstrap.min.css';
      var v = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : Date.now();
      link.setAttribute('href', base + '?v=' + v);
      var override = document.getElementById('dark-overrides-stylesheet');
      if (override) { override.disabled = (this.theme !== 'dark'); }
      Store.saveTheme(this.theme);
    },
    toggleTheme: function () {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme();
    },
    openSettings: function () { this.view = 'settings'; },
    closeSettings: function () { this.view = 'home'; },
    toggleVoiceEnabled: function () {
      this.voiceEnabled = !this.voiceEnabled;
      Store.saveVoiceEnabled(this.voiceEnabled);
    },
    // "enabled" arriva gia' risolto da settings-page (dopo l'eventuale
    // richiesta del permesso al browser): qui salviamo solo il risultato.
    toggleNotifyEnabled: function (enabled) {
      this.notifyEnabled = enabled;
      Store.saveNotifyEnabled(enabled);
    },
    openStats: function () { this.view = 'stats'; },
    closeStats: function () { this.view = 'home'; },

    installApp: function () {
      if (!this.deferredInstallPrompt) { return; }
      var self = this;
      var promptEvent = this.deferredInstallPrompt;
      // Il prompt e' utilizzabile una sola volta: lo si scarta subito dopo,
      // che l'utente accetti o rifiuti (se richiesta di nuovo l'installazione,
      // sara' il browser a emettere un nuovo evento 'beforeinstallprompt').
      this.deferredInstallPrompt = null;
      this.canInstall = false;
      promptEvent.prompt();
      promptEvent.userChoice.then(function () {}, function () {});
    },
    installFromPromo: function () {
      $(this.$refs.installPromoModal).modal('hide');
      this.installApp();
    },

    // ---- Sincronizzazione online -------------------------------------------
    showSyncInfo: function (message, isError) {
      this.syncInfoMessage = message;
      this.syncInfoIsError = !!isError;
      $(this.$refs.syncInfoModal).modal('show');
    },
    // Confronto silenzioso, eseguito all'apertura dell'app: aggiorna solo il
    // colore del bottone, senza mostrare nulla all'utente.
    checkSyncSilently: function () {
      var self = this;
      if (!RoutineSync.hasPassphrase()) { this.syncButtonState = 'neutral'; return; }
      this.syncButtonState = 'checking';
      RoutineSync.pull(function (err, result) {
        if (err) { self.syncButtonState = 'neutral'; return; }
        if (!result.exists) { self.syncButtonState = 'warning'; return; }
        var same = JSON.stringify(self.data) === JSON.stringify(result.data);
        self.syncButtonState = same ? 'ok' : 'warning';
      });
    },
    // Chiamato dal bottone "Sincronizza" in home: confronto reale e, se
    // servono decisioni, le chiede all'utente.
    syncNow: function () {
      if (!RoutineSync.hasPassphrase()) {
        this.openSettings();
        return;
      }
      var self = this;
      this.syncBusy = true;
      RoutineSync.pull(function (err, result) {
        self.syncBusy = false;
        if (err) {
          self.syncButtonState = 'neutral';
          self.showSyncInfo('Impossibile contattare il server: ' + err.message, true);
          return;
        }
        if (!result.exists) {
          // Nessun backup ancora presente sul server: lo creiamo subito,
          // non c'e' nessuna vera scelta da fare in questo caso.
          self.pushLocalToServer(function (pushErr) {
            if (pushErr) {
              self.showSyncInfo('Impossibile creare il backup sul server: ' + pushErr.message, true);
            } else {
              self.syncButtonState = 'ok';
              self.showSyncInfo('Backup creato sul server.', false);
            }
          });
          return;
        }
        var localJson = JSON.stringify(self.data);
        var serverJson = JSON.stringify(result.data);
        if (localJson === serverJson) {
          self.syncButtonState = 'ok';
          RoutineSync.setLastSyncedAt(Date.now());
          self.showSyncInfo('Tutto sincronizzato: questo dispositivo e il server coincidono.', false);
          return;
        }
        self.syncConflict = {
          localModified: Store.getLocalModified(),
          localCount: self.data.routines.length,
          serverModified: result.lastModified || null,
          serverCount: (result.data && result.data.routines) ? result.data.routines.length : 0,
          serverData: result.data
        };
        self.$nextTick(function () {
          $(self.$refs.syncConflictModal).modal('show');
        });
      });
    },
    pushLocalToServer: function (callback) {
      var self = this;
      var modified = Date.now();
      RoutineSync.push(this.data, modified, function (err) {
        if (!err) { RoutineSync.setLastSyncedAt(Date.now()); }
        if (callback) { callback(err); }
      });
    },
    resolveKeepLocal: function () {
      var self = this;
      $(this.$refs.syncConflictModal).modal('hide');
      this.pushLocalToServer(function (err) {
        if (err) { self.showSyncInfo('Impossibile salvare sul server: ' + err.message, true); return; }
        self.syncButtonState = 'ok';
        self.syncConflict = null;
        self.showSyncInfo('Fatto: il server ora ha la versione di questo dispositivo.', false);
      });
    },
    resolveKeepServer: function () {
      if (!this.syncConflict) { return; }
      var serverData = this.syncConflict.serverData;
      $(this.$refs.syncConflictModal).modal('hide');
      this.data = serverData;
      Store.save(this.data);
      Store.touchLocalModified();
      RoutineSync.setLastSyncedAt(Date.now());
      this.syncButtonState = 'ok';
      this.syncConflict = null;
      this.showSyncInfo('Fatto: questo dispositivo ora ha la versione del server.', false);
    },
    cancelSyncConflict: function () {
      this.syncConflict = null;
      // resta 'warning': la differenza non e' stata risolta
    },

    // ---- Modale di conferma condivisa (al posto di window.confirm) --------
    askConfirm: function (message, action) {
      this.confirmMessage = message;
      this.confirmPendingAction = action;
      $(this.$refs.confirmModal).modal('show');
    },
    runConfirmedAction: function () {
      var action = this.confirmPendingAction;
      this.confirmPendingAction = null;
      $(this.$refs.confirmModal).modal('hide');
      if (action) { action(); }
    },

    // ---- Navigazione: routine ---------------------------------------------
    newRoutine: function () {
      this.currentRoutineDraft = Models.newRoutine();
      this.editingRoutineIndex = null;
      this.isRoutineNew = true;
      this.view = 'routine-edit';
    },
    editRoutine: function (routine) {
      this.currentRoutineDraft = JSON.parse(JSON.stringify(routine));
      this.editingRoutineIndex = this.data.routines.findIndex(function (r) { return r.id === routine.id; });
      this.isRoutineNew = false;
      this.view = 'routine-edit';
    },
    cancelRoutineEdit: function () {
      this.currentRoutineDraft = null;
      this.editingRoutineIndex = null;
      this.view = 'home';
    },
    saveRoutineEdit: function () {
      this.persistRoutineDraft();
      this.currentRoutineDraft = null;
      this.editingRoutineIndex = null;
      this.view = 'home';
    },
    deleteRoutine: function (routine) {
      var self = this;
      this.askConfirm('Eliminare definitivamente la routine "' + routine.name + '"? Questa azione non pu\u00f2 essere annullata.', function () {
        var idx = self.data.routines.findIndex(function (r) { return r.id === routine.id; });
        if (idx !== -1) { self.data.routines.splice(idx, 1); }
        Store.save(self.data);
      });
    },

    // Salva/aggiorna la routine bozza corrente nell'elenco persistito.
    persistRoutineDraft: function () {
      if (!this.currentRoutineDraft) { return; }
      var draftCopy = JSON.parse(JSON.stringify(this.currentRoutineDraft));
      var existingIdx = this.data.routines.findIndex(function (r) { return r.id === draftCopy.id; });
      if (existingIdx === -1) {
        this.data.routines.push(draftCopy);
        this.editingRoutineIndex = this.data.routines.length - 1;
      } else {
        this.$set(this.data.routines, existingIdx, draftCopy);
        this.editingRoutineIndex = existingIdx;
      }
      Store.save(this.data);
    },
    // Versione "in background": non blocca l'interfaccia.
    persistRoutineDraftInBackground: function () {
      var self = this;
      setTimeout(function () { self.persistRoutineDraft(); }, 0);
    },
    onRoutineDraftChanged: function () {
      this.persistRoutineDraftInBackground();
    },

    // ---- Navigazione: task --------------------------------------------------
    addTaskToRoutine: function () {
      this.currentTaskDraft = Models.newTask();
      this.editingTaskIndex = null;
      this.isTaskNew = true;
      this.view = 'task-edit';
    },
    editTaskInRoutine: function (index) {
      this.currentTaskDraft = this.currentRoutineDraft.tasks[index];
      this.editingTaskIndex = index;
      this.isTaskNew = false;
      this.view = 'task-edit';
    },
    cancelTaskEdit: function () {
      this.currentTaskDraft = null;
      this.editingTaskIndex = null;
      this.view = 'routine-edit';
    },
    saveTaskEdit: function (task) {
      if (this.editingTaskIndex === null || this.editingTaskIndex < 0) {
        this.currentRoutineDraft.tasks.push(task);
      } else {
        this.$set(this.currentRoutineDraft.tasks, this.editingTaskIndex, task);
      }
      // Il task e' stato salvato: salviamo anche la routine associata,
      // in background, senza bloccare l'interfaccia.
      this.persistRoutineDraftInBackground();
      this.currentTaskDraft = null;
      this.editingTaskIndex = null;
      this.view = 'routine-edit';
    },

    // ---- Esecuzione routine (schermata separata) ----------------------------
    startRoutine: function (routine) {
      this.routineToExecute = routine;
      this.resumeExecutionSession = null;
      this.view = 'execution';
    },
    onRoutineFinished: function (payload) {
      this.routineToExecute = null;
      this.resumeExecutionSession = null;
      this.routineSummaryPayload = payload;
      this.view = 'summary';
    },
    onRoutineStopped: function () {
      this.routineToExecute = null;
      this.resumeExecutionSession = null;
      this.view = 'home';
    },
    closeSummary: function () {
      this.routineSummaryPayload = null;
      this.view = 'home';
    },

    // ---- Backup: export / import --------------------------------------------
    exportData: function () {
      var json = Store.exportJSON(this.data);
      var blob = new Blob([json], { type: 'application/json' });
      var d = new Date();
      function pad(n) { return n < 10 ? '0' + n : '' + n; }
      var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
        pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
      var filename = 'routine-export-' + stamp + '.json';

      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    },
    triggerImport: function () {
      this.importError = '';
      this.importSuccess = '';
      this.$refs.importFile.click();
    },
    handleImportFile: function (evt) {
      var self = this;
      var file = evt.target.files && evt.target.files[0];
      if (!file) { return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var imported = Store.parseImport(e.target.result);
          self.askConfirm(
            'Importare questo backup? Sostituir\u00e0 TUTTE le routine attualmente salvate su questo dispositivo (' + self.data.routines.length + ' -> ' + imported.routines.length + ').',
            function () {
              self.data = imported;
              Store.save(self.data);
              self.importSuccess = 'Importazione completata: ' + imported.routines.length + ' routine caricate.';
            }
          );
        } catch (err) {
          self.importError = 'File non valido o corrotto: ' + err.message;
        }
      };
      reader.readAsText(file);
      evt.target.value = '';
    }
  },
  created: function () {
    this.Store = Store;
    this.applyTheme();
    // Ogni modale Bootstrap crea automaticamente uno sfondo scuro (backdrop)
    // con priorita' piu' bassa dei popup dell'app: senza questo, lo sfondo
    // si fermava "sotto" header e footer invece di scurirli entrambi.
    $(document).on('shown.bs.modal', '.modal', function () {
      $('.modal-backdrop').last().css('z-index', 1060);
    });

    // Installazione PWA: 'beforeinstallprompt' esiste solo sui browser
    // Chromium (es. Chrome su Android) che ritengono l'app installabile.
    // EdgeHTML 14 non emette mai questo evento: addEventListener non fa
    // nulla di male, semplicemente il listener non scatta mai e il
    // pulsante "Installa" resta nascosto (canInstall resta false).
    var self = this;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      self.deferredInstallPrompt = e;
      self.canInstall = true;
    });
    window.addEventListener('appinstalled', function () {
      self.deferredInstallPrompt = null;
      self.canInstall = false;
    });
  },
  mounted: function () {
    var loader = document.getElementById('app-loader');
    if (loader && loader.parentNode) { loader.parentNode.removeChild(loader); }
    this.scrollToTop();

    var pending = Store.loadExecution();
    if (pending && pending.tasks && pending.tasks.length) {
      this.resumeExecutionSession = pending;
      this.routineToExecute = null;
      this.view = 'execution';
    }

    this.checkSyncSilently();
  }
});
