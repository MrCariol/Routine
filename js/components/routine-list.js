// components/routine-list.js
Vue.component('routine-list', {
  props: { routines: { type: Array, required: true } },
  methods: {
    times: function (routine) { return Models.computeRoutineTimes(routine); },
    duration: function (routine) { return Models.routineDurationSeconds(routine); }
  },
  created: function () { this.Store = Store; },
  template:
    '<div>' +
      '<div v-if="routines.length === 0" class="text-center text-muted border rounded p-5 mt-4">' +
        '<i class="mdi mdi-coffee mdi-48px mb-3"></i>' +
        '<p class="mb-0">Non hai ancora nessuna routine.<br>Tocca "Nuova routine" per crearne una.</p>' +
      '</div>' +
      '<div class="card mb-3" v-for="r in routines" :key="r.id">' +
        '<div class="card-body">' +
          '<div class="d-flex justify-content-between align-items-start">' +
            '<h5 class="card-title mb-1">{{ r.name }}</h5>' +
            '<span class="badge badge-secondary">{{ r.tasks.length }} task</span>' +
          '</div>' +
          '<p class="card-text text-muted mb-2">' +
            '<span v-if="r.timeMode !== \'none\'"><i class="mdi mdi-clock-outline"></i> {{ times(r).start || "--:--" }} &rarr; {{ times(r).end || "--:--" }} &middot; </span>' +
            '<i class="mdi mdi-timer-sand"></i> {{ Store.formatDuration(duration(r)) }}' +
          '</p>' +
          '<div class="btn-group w-100" role="group">' +
            '<button class="btn btn-success" @click="$emit(\'start\', r)" :disabled="r.tasks.length===0"><i class="mdi mdi-play"></i> Avvia</button>' +
            '<button class="btn btn-outline-secondary" @click="$emit(\'edit\', r)"><i class="mdi mdi-pencil"></i> Modifica</button>' +
            '<button class="btn btn-outline-danger" @click="$emit(\'delete\', r)"><i class="mdi mdi-trash-can-outline"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
});
