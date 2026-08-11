// components/routine-editor.js
// Pagina di creazione/modifica di una routine.
// Struttura: header fisso (indietro + titolo) + main scorrevole. Footer
// vuoto (il bottone "Salva routine" e' nel main, sopra l'elenco dei task).
// La routine (prop) e' di proprieta' del componente radice: qui mutiamo solo
// i suoi campi/array interni, cosi' la modifica sopravvive alla navigazione
// verso la pagina di modifica task e ritorno.

Vue.component('routine-edit-page', {
  props: {
    routine: { type: Object, required: true },
    isNew: { type: Boolean, default: true }
  },
  computed: {
    totalDuration: function () {
      return Models.routineDurationSeconds(this.routine);
    },
    computedTimes: function () {
      return Models.computeRoutineTimes(this.routine);
    },
    isValid: function () {
      return this.routine.name.trim().length > 0 && this.routine.tasks.length > 0;
    }
  },
  methods: {
    addTask: function () { this.$emit('add-task'); },
    editTask: function (index) { this.$emit('edit-task', index); },
    removeTask: function (index) {
      var self = this;
      this.$root.askConfirm('Eliminare questo task dalla routine?', function () {
        self.routine.tasks.splice(index, 1);
        self.$emit('changed');
      });
    },
    moveTask: function (index, dir) {
      var target = index + dir;
      if (target < 0 || target >= this.routine.tasks.length) { return; }
      var arr = this.routine.tasks;
      var tmp = arr[index];
      this.$set(arr, index, arr[target]);
      this.$set(arr, target, tmp);
      this.$emit('changed');
    },
    save: function () {
      if (!this.isValid) { return; }
      this.$emit('save');
    },
    cancel: function () { this.$emit('cancel'); }
  },
  created: function () {
    this.Store = Store;
    this.Models = Models;
    if (!this.routine.soundMode) { this.routine.soundMode = 'default'; }
  },
  template:
    '<div>' +

      '<div class="fixed-top d-flex align-items-center px-3 border-bottom" style="height:56px;z-index:1050;" :class="$root.theme === \'dark\' ? \'bg-dark text-light\' : \'bg-white text-dark\'">' +
        '<button type="button" class="btn btn-outline-secondary mr-2" @click="cancel"><i class="mdi mdi-arrow-left"></i></button>' +
        '<span class="h5 mb-0 text-truncate">{{ isNew ? "Nuova routine" : "Modifica routine" }}</span>' +
      '</div>' +

      '<div class="container" style="padding-top:72px;padding-bottom:24px;">' +

        '<div class="form-group">' +
          '<label class="font-weight-bold">Nome routine</label>' +
          '<input type="text" class="form-control form-control-lg" placeholder="Es. Routine del mattino" v-model="routine.name">' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="font-weight-bold">Orario di riferimento</label>' +
          '<div class="form-row">' +
            '<div class="col-6">' +
              '<select class="form-control" v-model="routine.timeMode">' +
                '<option value="none">Nessun orario</option>' +
                '<option value="start">Orario di inizio</option>' +
                '<option value="end">Orario di fine</option>' +
              '</select>' +
            '</div>' +
            '<div class="col-6" v-if="routine.timeMode !== \'none\'">' +
              '<input type="time" class="form-control" v-model="routine.timeValue">' +
            '</div>' +
          '</div>' +
          '<small class="form-text text-muted" v-if="routine.timeMode !== \'none\'">' +
            'Inizio: <strong>{{ computedTimes.start || "--:--" }}</strong> &nbsp;&middot;&nbsp; Fine: <strong>{{ computedTimes.end || "--:--" }}</strong>' +
          '</small>' +
          '<small class="form-text text-muted" v-else>La routine andra\' avviata manualmente, senza orario di riferimento.</small>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="font-weight-bold">Suoni durante l\'esecuzione</label>' +
          '<select class="form-control" v-model="routine.soundMode">' +
            '<option value="default">Predefinito (usa le impostazioni)</option>' +
            '<option value="voice">Voce</option>' +
            '<option value="beep">Bip</option>' +
            '<option value="none">Nessun suono</option>' +
          '</select>' +
        '</div>' +

        '<button type="button" class="btn btn-primary btn-lg btn-block mb-3" :disabled="!isValid" @click="save">Salva routine</button>' +

        '<hr>' +
        '<div class="d-flex justify-content-between align-items-center mb-2">' +
          '<label class="font-weight-bold mb-0">Task della routine</label>' +
          '<small class="text-muted">Durata totale: {{ Store.formatDuration(totalDuration) }}</small>' +
        '</div>' +

        '<div v-if="routine.tasks.length === 0" class="text-muted text-center border rounded p-4 mb-2">' +
          'Nessun task ancora. Aggiungine uno per iniziare.' +
        '</div>' +

        '<ul class="list-group mb-2">' +
          '<li class="list-group-item d-flex align-items-center" v-for="(t, idx) in routine.tasks" :key="t.id">' +
            '<i class="mdi mdi-36px mr-2" :class="t.icon" :style="{color: t.color}"></i>' +
            '<div class="flex-grow-1" @click="editTask(idx)" style="cursor:pointer;">' +
              '<div>{{ t.name }}</div>' +
              '<small class="text-muted">{{ Store.formatDuration(Models.taskDurationSeconds(t)) }}</small>' +
            '</div>' +
            '<button class="btn btn-sm btn-outline-secondary mr-1" @click="moveTask(idx, -1)" :disabled="idx===0"><i class="mdi mdi-arrow-up"></i></button>' +
            '<button class="btn btn-sm btn-outline-secondary mr-1" @click="moveTask(idx, 1)" :disabled="idx===routine.tasks.length-1"><i class="mdi mdi-arrow-down"></i></button>' +
            '<button class="btn btn-sm btn-outline-secondary mr-1" @click="editTask(idx)"><i class="mdi mdi-pencil"></i></button>' +
            '<button class="btn btn-sm btn-outline-danger" @click="removeTask(idx)"><i class="mdi mdi-trash-can-outline"></i></button>' +
          '</li>' +
        '</ul>' +

        '<button type="button" class="btn btn-outline-primary btn-block" @click="addTask"><i class="mdi mdi-plus"></i> Aggiungi task</button>' +

      '</div>' +

    '</div>'
});
