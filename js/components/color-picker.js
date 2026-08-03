// components/color-picker.js
// Modale Bootstrap per scegliere solo il colore (separato dalla ricerca icona).
// Nessuna animazione: la classe "fade" non viene usata di proposito.

Vue.component('color-picker', {
  props: {
    value: { type: String, default: '#3498DB' }
  },
  data: function () {
    return {
      colors: Store.ICON_COLORS,
      tempColor: this.value
    };
  },
  watch: {
    value: function (v) { this.tempColor = v; }
  },
  methods: {
    open: function () {
      this.tempColor = this.value;
      $(this.$refs.modal).modal('show');
    },
    confirm: function () {
      this.$emit('input', this.tempColor);
      $(this.$refs.modal).modal('hide');
    }
  },
  template:
    '<div class="d-inline-block">' +
      '<button type="button" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" style="width:64px;height:64px;" @click="open">' +
        '<span class="rounded-circle" style="width:32px;height:32px;display:inline-block;" :style="{backgroundColor: value}"></span>' +
      '</button>' +
      '<div class="modal" tabindex="-1" ref="modal" style="z-index:1070;">' +
        '<div class="modal-dialog modal-dialog-centered">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title">Scegli colore</h5>' +
              '<button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<div class="d-flex flex-wrap justify-content-center">' +
                '<button v-for="c in colors" :key="c.hex" type="button" ' +
                  'class="btn p-0 m-2 rounded-circle" ' +
                  'style="width:48px;height:48px;border:2px solid rgba(128,128,128,.4);" ' +
                  ':style="{backgroundColor: c.hex, outline: (tempColor===c.hex ? \'3px solid #000\' : \'none\')}" ' +
                  ':title="c.name" @click="tempColor = c.hex">' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-secondary" data-dismiss="modal">Annulla</button>' +
              '<button type="button" class="btn btn-primary" @click="confirm">Conferma</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
});
