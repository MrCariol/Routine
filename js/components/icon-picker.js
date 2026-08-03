// components/icon-picker.js
// Modale Bootstrap per scegliere SOLO l'icona (Material Design Icons, ricerca
// testuale). Il colore e' gestito da un componente separato: color-picker.
// Nessuna animazione (niente classe "fade").

Vue.component('icon-picker', {
  props: {
    value: { type: String, default: 'mdi-check-circle-outline' },
    previewColor: { type: String, default: '#3498DB' }
  },
  data: function () {
    return {
      search: '',
      tempIcon: this.value,
      maxShown: 60
    };
  },
  computed: {
    filteredIcons: function () {
      var q = this.search.trim().toLowerCase();
      var all = window.MDI_ICONS || [];
      var list = all;
      if (q) {
        list = all.filter(function (icon) {
          return icon.id.indexOf(q) !== -1 || icon.label.indexOf(q) !== -1;
        });
      }
      return list.slice(0, this.maxShown);
    },
    totalMatches: function () {
      var q = this.search.trim().toLowerCase();
      if (!q) { return (window.MDI_ICONS || []).length; }
      return (window.MDI_ICONS || []).filter(function (icon) {
        return icon.id.indexOf(q) !== -1 || icon.label.indexOf(q) !== -1;
      }).length;
    }
  },
  watch: {
    value: function (v) { this.tempIcon = v; }
  },
  methods: {
    open: function () {
      this.tempIcon = this.value;
      this.search = '';
      $(this.$refs.modal).modal('show');
    },
    pick: function (icon) {
      this.tempIcon = 'mdi-' + icon.id;
    },
    confirm: function () {
      this.$emit('input', this.tempIcon);
      $(this.$refs.modal).modal('hide');
    }
  },
  template:
    '<div class="d-inline-block">' +
      '<button type="button" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" style="width:64px;height:64px;" @click="open">' +
        '<i class="mdi mdi-36px" :class="value" :style="{color: previewColor}"></i>' +
      '</button>' +
      '<div class="modal" tabindex="-1" ref="modal" style="z-index:1070;">' +
        '<div class="modal-dialog modal-dialog-centered modal-lg">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title"><i class="mdi mdi-24px" :class="tempIcon" :style="{color: previewColor}"></i>&nbsp; Scegli icona</h5>' +
              '<button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<div class="form-group">' +
                '<input type="text" class="form-control form-control-lg" placeholder="Cerca icona (es. caffe, sveglia, libro...)" v-model="search">' +
                '<small class="form-text text-muted">{{ totalMatches }} risultati' +
                  '<span v-if="totalMatches > maxShown"> (mostrati i primi {{ maxShown }}, affina la ricerca per vederne altre)</span>' +
                '</small>' +
              '</div>' +
              '<div style="max-height:320px;overflow-y:auto;" class="border rounded p-2">' +
                '<div class="d-flex flex-wrap">' +
                  '<button v-for="icon in filteredIcons" :key="icon.id" type="button" ' +
                    'class="btn btn-sm d-flex flex-column align-items-center justify-content-center m-1" ' +
                    ':class="tempIcon === (\'mdi-\'+icon.id) ? \'btn-primary\' : \'btn-outline-secondary\'" ' +
                    'style="width:70px;height:64px;" @click="pick(icon)" :title="icon.label">' +
                    '<i class="mdi mdi-24px" :class="\'mdi-\'+icon.id" :style="{color: tempIcon === (\'mdi-\'+icon.id) ? \'\' : previewColor}"></i>' +
                    '<small class="text-truncate" style="max-width:64px;font-size:.65rem;">{{ icon.label }}</small>' +
                  '</button>' +
                '</div>' +
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
