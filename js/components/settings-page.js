// components/settings-page.js
// Pagina Impostazioni: tema chiaro/scuro, backup (esporta/importa),
// sincronizzazione online (creazione/uso/disattivazione chiave).
// Struttura: header fisso (indietro + titolo), main scorrevole, footer vuoto.

Vue.component('settings-page', {
  props: {
    theme: { type: String, required: true },
    canInstall: { type: Boolean, default: false },
    importSuccess: { type: String, default: '' },
    importError: { type: String, default: '' },
    voiceEnabled: { type: Boolean, default: true }
  },
  data: function () {
    return {
      hasKey: RoutineSync.hasPassphrase(),
      syncKeyValue: RoutineSync.getPassphrase(),
      lastSyncedAt: RoutineSync.getLastSyncedAt(),
      showKeyInput: false,
      keyDraft: '',
      voiceSupported: !!(window.RoutineVoice && RoutineVoice.supported())
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
    doExport: function () { this.$emit('export'); },
    doImport: function () { this.$emit('import'); },
    dismissSuccess: function () { this.$emit('dismiss-success'); },
    dismissError: function () { this.$emit('dismiss-error'); },

    createSyncKey: function () {
      var key = RoutineSync.generatePassphrase();
      RoutineSync.setPassphrase(key);
      this.hasKey = true;
      this.syncKeyValue = key;
      this.lastSyncedAt = null;
      this.$root.syncButtonState = 'warning';
    },
    confirmExistingKey: function () {
      var trimmed = this.keyDraft.trim();
      if (!trimmed) { return; }
      RoutineSync.setPassphrase(trimmed);
      this.hasKey = true;
      this.syncKeyValue = trimmed;
      this.showKeyInput = false;
      this.keyDraft = '';
      this.lastSyncedAt = RoutineSync.getLastSyncedAt();
      this.$root.checkSyncSilently();
    },
    copyKey: function () {
      var input = this.$refs.syncKeyInput;
      if (!input) { return; }
      input.select();
      try { document.execCommand('copy'); } catch (e) {}
    },
    disableSync: function () {
      var self = this;
      this.$root.askConfirm(
        'Disattivare la sincronizzazione su questo dispositivo? La chiave verr\u00e0 dimenticata qui, ma il backup sul server NON verr\u00e0 cancellato.',
        function () {
          RoutineSync.clearPassphrase();
          self.hasKey = false;
          self.syncKeyValue = '';
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
          '<li class="list-group-item" style="cursor:pointer;" @click="doExport">' +
            '<i class="mdi mdi-download mr-2"></i> Esporta backup' +
          '</li>' +
          '<li class="list-group-item" style="cursor:pointer;" @click="doImport">' +
            '<i class="mdi mdi-upload mr-2"></i> Importa backup' +
          '</li>' +
        '</ul>' +

        '<h6 class="font-weight-bold">Sincronizzazione online</h6>' +

        '<div v-if="!hasKey">' +
          '<p class="text-muted small">Salva un backup delle tue routine su un server, recuperabile anche da un altro dispositivo, senza bisogno di creare un account: basta una chiave.</p>' +
          '<button type="button" class="btn btn-outline-primary btn-block mb-2" @click="createSyncKey">Crea nuova chiave di sincronizzazione</button>' +
          '<button type="button" class="btn btn-outline-secondary btn-block" @click="showKeyInput = !showKeyInput">Ho gi\u00e0 una chiave</button>' +
          '<div class="input-group mt-2" v-if="showKeyInput">' +
            '<input type="text" class="form-control" placeholder="parola-parola-parola-parola-parola" v-model="keyDraft">' +
            '<div class="input-group-append"><button class="btn btn-outline-primary" type="button" @click="confirmExistingKey">Conferma</button></div>' +
          '</div>' +
        '</div>' +

        '<div v-else>' +
          '<div class="input-group mb-2">' +
            '<input type="text" class="form-control" readonly :value="syncKeyValue" ref="syncKeyInput">' +
            '<div class="input-group-append"><button class="btn btn-outline-secondary" type="button" @click="copyKey" title="Copia"><i class="mdi mdi-content-copy"></i></button></div>' +
          '</div>' +
          '<p class="text-muted small">Conserva questa chiave: \u00e8 l\'unico modo per ritrovare il backup da un altro dispositivo. Non condividerla con nessuno.</p>' +
          '<p class="text-muted small" v-if="lastSyncedLabel">Ultima sincronizzazione riuscita: {{ lastSyncedLabel }}</p>' +
          '<button type="button" class="btn btn-outline-danger btn-block" @click="disableSync">Disattiva sincronizzazione su questo dispositivo</button>' +
        '</div>' +

        '<p class="text-muted small mt-3">In futuro qui potranno comparire altre impostazioni.</p>' +

      '</div>' +

    '</div>'
});
