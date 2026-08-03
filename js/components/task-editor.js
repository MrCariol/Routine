// components/task-editor.js
// Pagina di creazione/modifica di un singolo task.
// Struttura: header fisso (indietro + titolo), main scorrevole, footer fisso
// (Annulla / Salva task). Icona, colore e durata restano popup.
// Nessuna animazione da nessuna parte.

Vue.component('task-edit-page', {
  props: {
    initialTask: { type: Object, required: true },
    isNew: { type: Boolean, default: true }
  },
  data: function () {
    return {
      task: JSON.parse(JSON.stringify(this.initialTask)),
      newSubtaskName: ''
    };
  },
  computed: {
    totalSeconds: function () {
      return Models.taskDurationSeconds(this.task);
    },
    durationLabel: function () {
      return Store.formatDuration(this.totalSeconds);
    },
    isValid: function () {
      return this.task.name.trim().length > 0 && this.totalSeconds > 0;
    }
  },
  methods: {
    openDurationPicker: function () { this.$refs.durationPicker.open(); },
    onDurationSaved: function (d) {
      this.task.hours = d.hours;
      this.task.minutes = d.minutes;
      this.task.seconds = d.seconds;
    },
    addSubtask: function () {
      var name = this.newSubtaskName.trim();
      if (!name) { return; }
      this.task.subtasks.push(Models.newSubtask(name));
      this.newSubtaskName = '';
    },
    removeSubtask: function (index) {
      this.task.subtasks.splice(index, 1);
    },
    moveSubtask: function (index, dir) {
      var target = index + dir;
      if (target < 0 || target >= this.task.subtasks.length) { return; }
      var arr = this.task.subtasks;
      var tmp = arr[index];
      this.$set(arr, index, arr[target]);
      this.$set(arr, target, tmp);
    },
    save: function () {
      if (!this.isValid) { return; }
      this.$emit('save', this.task);
    },
    cancel: function () {
      this.$emit('cancel');
    }
  },
  created: function () { this.Store = Store; },
  template:
    '<div>' +

      '<div class="fixed-top d-flex align-items-center px-3 border-bottom" style="height:56px;z-index:1050;" :class="$root.theme === \'dark\' ? \'bg-dark text-light\' : \'bg-white text-dark\'">' +
        '<button type="button" class="btn btn-outline-secondary mr-2" @click="cancel"><i class="mdi mdi-arrow-left"></i></button>' +
        '<span class="h5 mb-0 text-truncate">{{ isNew ? "Nuovo task" : "Modifica task" }}</span>' +
      '</div>' +

      '<div class="container" style="padding-top:72px;padding-bottom:88px;">' +

        '<div class="form-row align-items-center mb-3">' +
          '<div class="col-auto">' +
            '<icon-picker ref="iconPicker" v-model="task.icon" :preview-color="task.color"></icon-picker>' +
          '</div>' +
          '<div class="col-auto">' +
            '<color-picker ref="colorPicker" v-model="task.color"></color-picker>' +
          '</div>' +
          '<div class="col"><input type="text" class="form-control form-control-lg" placeholder="Nome del task" v-model="task.name"></div>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="font-weight-bold">Durata</label>' +
          '<div class="d-flex align-items-center">' +
            '<span class="h4 mb-0 mr-3">{{ durationLabel }}</span>' +
            '<button type="button" class="btn btn-outline-primary" @click="openDurationPicker"><i class="mdi mdi-timer-sand"></i> Modifica durata</button>' +
          '</div>' +
          '<duration-picker ref="durationPicker" :hours="task.hours" :minutes="task.minutes" :seconds="task.seconds" @save="onDurationSaved"></duration-picker>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="font-weight-bold">Descrizione</label>' +
          '<textarea class="form-control" rows="3" placeholder="Informazioni aggiuntive per questo task (facoltativo)" v-model="task.description"></textarea>' +
        '</div>' +

        '<div class="form-group">' +
          '<div class="custom-control custom-switch">' +
            '<input type="checkbox" class="custom-control-input" id="autoCompleteSwitch" v-model="task.autoComplete">' +
            '<label class="custom-control-label" for="autoCompleteSwitch">Completa automaticamente allo scadere del tempo</label>' +
          '</div>' +
          '<small class="form-text text-muted">Se disattivato (default) dovrai completarlo tu manualmente durante la routine.</small>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="font-weight-bold">Sotto-task</label>' +
          '<ul class="list-group mb-2">' +
            '<li class="list-group-item d-flex align-items-center" v-for="(st, idx) in task.subtasks" :key="st.id">' +
              '<span class="flex-grow-1">{{ st.name }}</span>' +
              '<button class="btn btn-sm btn-outline-secondary mr-1" @click="moveSubtask(idx, -1)" :disabled="idx===0"><i class="mdi mdi-arrow-up"></i></button>' +
              '<button class="btn btn-sm btn-outline-secondary mr-1" @click="moveSubtask(idx, 1)" :disabled="idx===task.subtasks.length-1"><i class="mdi mdi-arrow-down"></i></button>' +
              '<button class="btn btn-sm btn-outline-danger" @click="removeSubtask(idx)"><i class="mdi mdi-trash-can-outline"></i></button>' +
            '</li>' +
          '</ul>' +
          '<div class="input-group">' +
            '<input type="text" class="form-control" placeholder="Nome sotto-task" v-model="newSubtaskName" @keyup.enter="addSubtask">' +
            '<div class="input-group-append"><button class="btn btn-outline-primary" type="button" @click="addSubtask"><i class="mdi mdi-plus"></i> Aggiungi</button></div>' +
          '</div>' +
        '</div>' +

      '</div>' +

      '<div class="fixed-bottom d-flex px-3 border-top" style="height:64px;z-index:1050;" :class="$root.theme === \'dark\' ? \'bg-dark\' : \'bg-white\'">' +
        '<button type="button" class="btn btn-secondary flex-fill my-auto mr-2" @click="cancel">Annulla</button>' +
        '<button type="button" class="btn btn-primary flex-fill my-auto" :disabled="!isValid" @click="save">Salva task</button>' +
      '</div>' +

    '</div>'
});
