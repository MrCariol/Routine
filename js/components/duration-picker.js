// components/duration-picker.js
// Modale Bootstrap compatta per impostare ore/minuti/secondi solo tramite
// bottoni (niente tastiera): per ogni unita' una riga "-10 -1 [numero] +1 +10".
// Nessuna animazione (niente classe "fade").

Vue.component('duration-picker', {
  props: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 5 },
    seconds: { type: Number, default: 0 }
  },
  data: function () {
    return {
      h: this.hours,
      m: this.minutes,
      s: this.seconds
    };
  },
  methods: {
    open: function () {
      this.h = this.hours;
      this.m = this.minutes;
      this.s = this.seconds;
      $(this.$refs.modal).modal('show');
    },
    adjust: function (field, delta) {
      var max = field === 'h' ? 23 : 59;
      var v = this[field] + delta;
      if (v < 0) { v = 0; }
      if (v > max) { v = max; }
      this[field] = v;
    },
    confirm: function () {
      this.$emit('save', { hours: this.h, minutes: this.m, seconds: this.s });
      $(this.$refs.modal).modal('hide');
    }
  },
  template:
    '<div class="modal" tabindex="-1" ref="modal" style="z-index:1070;">' +
      '<div class="modal-dialog modal-dialog-centered">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title">Imposta durata</h5>' +
            '<button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>' +
          '</div>' +
          '<div class="modal-body">' +

            '<div class="d-flex align-items-center justify-content-between mb-3">' +
              '<strong class="mr-2">Ore</strong>' +
              '<div class="btn-group align-items-center">' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'h\', -10)">-10</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'h\', -1)">-1</button>' +
                '<button class="btn btn-light font-weight-bold" style="min-width:3.2rem;font-size:1.15rem;" disabled>{{ h }}</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'h\', 1)">+1</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'h\', 10)">+10</button>' +
              '</div>' +
            '</div>' +

            '<div class="d-flex align-items-center justify-content-between mb-3">' +
              '<strong class="mr-2">Minuti</strong>' +
              '<div class="btn-group align-items-center">' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'m\', -10)">-10</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'m\', -1)">-1</button>' +
                '<button class="btn btn-light font-weight-bold" style="min-width:3.2rem;font-size:1.15rem;" disabled>{{ m }}</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'m\', 1)">+1</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'m\', 10)">+10</button>' +
              '</div>' +
            '</div>' +

            '<div class="d-flex align-items-center justify-content-between">' +
              '<strong class="mr-2">Secondi</strong>' +
              '<div class="btn-group align-items-center">' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'s\', -10)">-10</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'s\', -1)">-1</button>' +
                '<button class="btn btn-light font-weight-bold" style="min-width:3.2rem;font-size:1.15rem;" disabled>{{ s }}</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'s\', 1)">+1</button>' +
                '<button class="btn btn-outline-secondary" @click="adjust(\'s\', 10)">+10</button>' +
              '</div>' +
            '</div>' +

          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" data-dismiss="modal">Annulla</button>' +
            '<button type="button" class="btn btn-primary" @click="confirm">Conferma</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
});
