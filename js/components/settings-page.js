// components/settings-page.js
// Pagina Impostazioni: tema chiaro/scuro, backup (esporta/importa),
// sincronizzazione online (login/logout verso l'hub di autenticazione).
// Struttura: header fisso (indietro + titolo), main scorrevole, footer vuoto.

Vue.component('settings-page', {
  props: {
    theme: { type: String, required: true },
    canInstall: { type: Boolean, default: false },
    importSuccess: { type: String, default: '' },
    importError: { type: String, default: '' },
    voiceEnabled: { type: Boolean, default: true },
    notifyEnabled: { type: Boolean, default: false }
  },
  data: function () {
    return {
      // valore iniziale "al meglio": RoutineAuth.consumeCallbackToken() gira
      // nel created() di js/app.js, ben prima che l'utente possa arrivare
      // qui aprendo Impostazioni, quindi a questo punto e' gia' affidabile
      loggedIn: RoutineAuth.isLoggedIn(),
      authHubDomainDraft: RoutineAuth.getHubDomain(),
      lastSyncedAt: RoutineSync.getLastSyncedAt(),
      serverUrlDraft: RoutineSync.getServerUrl(),
      voiceSupported: !!(window.RoutineVoice && RoutineVoice.supported()),
      notifySupported: !!(window.RoutineNotify && RoutineNotify.supported()),
      notifyPermission: window.RoutineNotify ? RoutineNotify.permission() : 'unsupported'
    };
  },
  computed: {
    lastSyncedLabel: function () {
      if (!this.lastSyncedAt) { return ''; }
      var d = new Date(this.lastSyncedAt);
      var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
  },
  methods: {
    back: function () { this.$emit('back'); },
    doInstall: function () { this.$emit('install'); },
    toggleTheme: function () { this.$emit('toggle-theme'); },
    toggleVoiceEnabled: function () { this.$emit('toggle-voice-enabled'); },
    // Se si sta accendendo e il permesso non e' ancora stato concesso, lo
    // richiede al browser (deve avvenire durante questo stesso tocco
    // dell'utente). Se l'utente nega, l'interruttore resta/torna spento.
    toggleNotifyEnabled: function () {
      var self = this;
      if (this.notifyEnabled) {
        this.$emit('toggle-notify-enabled', false);
        return;
      }
      RoutineNotify.requestPermission(function (granted) {
        self.notifyPermission = RoutineNotify.permission();
        self.$emit('toggle-notify-enabled', granted);
      });
    },
    doExport: function () { this.$emit('export'); },
    doImport: function () { this.$emit('import'); },
    dismissSuccess: function () { this.$emit('dismiss-success'); },
    dismissError: function () { this.$emit('dismiss-error'); },

    saveServerUrl: function () {
      RoutineSync.setServerUrl(this.serverUrlDraft.trim());
      this.$root.checkSyncSilently();
    },
    saveAuthHubDomain: function () {
      RoutineAuth.setHubDomain(this.authHubDomainDraft);
      this.authHubDomainDraft = RoutineAuth.getHubDomain();
    },
    login: function () {
      if (!this.authHubDomainDraft) { return; }
      this.saveAuthHubDomain();
      RoutineAuth.startLogin();
    },
    logout: function () {
      var self = this;
      this.$root.askConfirm(
        'Disconnettersi da questo dispositivo? Il backup sul server NON verr\u00e0 cancellato: potrai ritrovarlo accedendo di nuovo con lo stesso account.',
        function () {
          RoutineAuth.logout();
          self.loggedIn = false;
          self.$root.authUser = null;
          self.$root.syncButtonState = 'neutral';
        }
      );
    }
  },
  template:
    '<div>' +

      '<div class="fixed-top d-flex align-items-center px-3 border-bottom" style="height:56px;z-index:1050;" :class="theme === \'dark\' ? \'bg-dark text-light\' : \'bg-white text-dark\'">' +
        '<button type="button" class="btn btn-outline-secondary mr-2" @click="back"><i class="mdi mdi-arrow-left"></i></button>' +
        '<span class="h5 mb-0">Impostazioni</span>' +
      '</div>' +

      '<div class="container" style="padding-top:72px;padding-bottom:24px;">' +

        '<div class="alert alert-success alert-dismissible show" v-if="importSuccess">' +
          '{{ importSuccess }}' +
          '<button type="button" class="close" @click="dismissSuccess"><span>&times;</span></button>' +
        '</div>' +
        '<div class="alert alert-danger alert-dismissible show" v-if="importError">' +
          '{{ importError }}' +
          '<button type="button" class="close" @click="dismissError"><span>&times;</span></button>' +
        '</div>' +

        '<ul class="list-group mb-4">' +
          '<li class="list-group-item" style="cursor:pointer;" v-if="canInstall" @click="doInstall">' +
            '<i class="mdi mdi-download mr-2"></i> Installa l\'app' +
          '</li>' +
          '<li class="list-group-item d-flex justify-content-between align-items-center">' +
            '<span><i class="mdi mr-2" :class="theme === \'dark\' ? \'mdi-weather-night\' : \'mdi-weather-sunny\'"></i> Tema scuro</span>' +
            '<div class="custom-control custom-switch">' +
              '<input type="checkbox" class="custom-control-input" id="themeSwitch" :checked="theme === \'dark\'" @change="toggleTheme">' +
              '<label class="custom-control-label" for="themeSwitch"></label>' +
            '</div>' +
          '</li>' +
          '<li class="list-group-item d-flex justify-content-between align-items-center">' +
            '<span><i class="mdi mdi-account-voice mr-2"></i> Annunci vocali</span>' +
            '<div class="custom-control custom-switch">' +
              '<input type="checkbox" class="custom-control-input" id="voiceSwitch" :disabled="!voiceSupported" :checked="voiceEnabled" @change="toggleVoiceEnabled">' +
              '<label class="custom-control-label" for="voiceSwitch"></label>' +
            '</div>' +
          '</li>' +
          '<li class="list-group-item text-muted small" v-if="!voiceSupported">' +
            'Il tuo dispositivo non supporta la sintesi vocale: verranno usati i bip.' +
          '</li>' +
          '<li class="list-group-item d-flex justify-content-between align-items-center">' +
            '<span><i class="mdi mdi-bell-outline mr-2"></i> Notifica durante l\'esecuzione</span>' +
            '<div class="custom-control custom-switch">' +
              '<input type="checkbox" class="custom-control-input" id="notifySwitch" :disabled="!notifySupported || notifyPermission === \'denied\'" :checked="notifyEnabled" @change="toggleNotifyEnabled">' +
              '<label class="custom-control-label" for="notifySwitch"></label>' +
            '</div>' +
          '</li>' +
          '<li class="list-group-item text-muted small" v-if="!notifySupported">' +
            'Il tuo dispositivo non supporta le notifiche.' +
          '</li>' +
          '<li class="list-group-item text-muted small" v-else-if="notifyPermission === \'denied\'">' +
            'Hai bloccato le notifiche per questo sito: per attivarle, riabilitale dalle impostazioni del browser.' +
          '</li>' +
          '<li class="list-group-item text-muted small" v-else>' +
            'Mostra il task corrente e l\'orario di fine; non e\' un timer live (i browser sospendono gli aggiornamenti in background).' +
          '</li>' +
          '<li class="list-group-item" style="cursor:pointer;" @click="doExport">' +
            '<i class="mdi mdi-download mr-2"></i> Esporta backup' +
          '</li>' +
          '<li class="list-group-item" style="cursor:pointer;" @click="doImport">' +
            '<i class="mdi mdi-upload mr-2"></i> Importa backup' +
          '</li>' +
        '</ul>' +

        '<h6 class="font-weight-bold">Sincronizzazione online</h6>' +

        '<div class="form-group">' +
          '<label class="small text-muted mb-1" for="syncServerUrl">Server di sincronizzazione</label>' +
          '<input type="text" class="form-control" id="syncServerUrl" placeholder="https://tuodominio.it" v-model="serverUrlDraft" @change="saveServerUrl">' +
          '<small class="form-text text-muted">Dove sono salvati i backup (questo stesso sito, di solito). Lascia vuoto per usare lo stesso dominio che serve l\'app. Da compilare qui nell\'app installata (nessun dominio di default) o se backend e frontend sono su domini diversi.</small>' +
        '</div>' +

        '<div v-if="!loggedIn">' +
          '<p class="text-muted small">L\'accesso avviene tramite un hub di autenticazione esterno (nessuna password gestita da quest\'app): indica il suo dominio, poi accedi. Puoi self-hostarne uno tuo (progetto <code>auth-hub</code>) o usarne uno di cui ti fidi.</p>' +
          '<div class="form-group">' +
            '<label class="small text-muted mb-1" for="authHubDomain">Dominio hub di autenticazione</label>' +
            '<input type="text" class="form-control" id="authHubDomain" placeholder="es. auth.tuodominio.it" v-model.trim="authHubDomainDraft" @blur="saveAuthHubDomain" @keyup.enter="saveAuthHubDomain">' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-block" @click="login" :disabled="!authHubDomainDraft">Accedi</button>' +
        '</div>' +

        '<div v-else>' +
          '<p class="mb-1" v-if="$root.authUser">Connesso come <strong>{{ $root.authUser.name }}</strong><span class="d-block small text-muted">{{ $root.authUser.email }}</span></p>' +
          '<p class="small text-muted mb-1">Hub di autenticazione: <strong>{{ authHubDomainDraft }}</strong></p>' +
          '<p class="text-muted small" v-if="lastSyncedLabel">Ultima sincronizzazione riuscita: {{ lastSyncedLabel }}</p>' +
          '<button type="button" class="btn btn-outline-danger btn-block" @click="logout">Esci</button>' +
        '</div>' +

        '<p class="text-muted small mt-3">In futuro qui potranno comparire altre impostazioni.</p>' +

      '</div>' +

    '</div>'
});
