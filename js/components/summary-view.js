// components/summary-view.js
// Schermata di riepilogo al termine di una routine.
// Struttura: nessun header (niente da mostrare in alto), main scorrevole,
// footer fisso con il bottone "Torna alla home". Nessuna animazione.

Vue.component('summary-view', {
  props: {
    payload: { type: Object, required: true }
  },
  methods: {
    close: function () { this.$emit('close'); }
  },
  created: function () { this.Store = Store; },
  template:
    '<div>' +

      '<div class="container" style="padding-top:24px;padding-bottom:88px;">' +
        '<div class="text-center">' +
          '<i class="mdi mdi-48px mdi-check-circle text-success mb-2"></i>' +
          '<h4>Routine completata</h4>' +
          '<p class="text-muted mb-1">{{ payload.routineName }}</p>' +
          '<p class="h5 mb-4">Durata effettiva: {{ Store.formatDuration(payload.totalElapsedSeconds) }}</p>' +
        '</div>' +

        '<ul class="list-group text-left">' +
          '<li class="list-group-item d-flex align-items-center" v-for="t in payload.tasks" :key="t.id">' +
            '<i class="mdi mr-2" :class="t.icon" :style="{color: t.color}"></i>' +
            '<span class="flex-grow-1">{{ t.name }}</span>' +
            '<i class="mdi mr-2" :class="t.status === \'skipped\' ? \'mdi-skip-next text-danger\' : \'mdi-check text-success\'"></i>' +
            '<small class="text-muted" style="min-width:56px;text-align:right;">{{ t.status === \'completed\' ? Store.formatDuration(t.elapsedSeconds) : \'\' }}</small>' +
          '</li>' +
        '</ul>' +
      '</div>' +

      '<div class="fixed-bottom d-flex px-3 border-top" style="height:64px;z-index:1050;" :class="$root.theme === \'dark\' ? \'bg-dark\' : \'bg-white\'">' +
        '<button type="button" class="btn btn-primary flex-fill my-auto" @click="close">Torna alla home</button>' +
      '</div>' +

    '</div>'
});
