// components/stats-page.js
// Pagina Statistiche: elenco routine con riepilogo rapido (tempo oggi,
// streak, media a esecuzione) + dettaglio per routine selezionata
// (tabella task, storico ultimi giorni). Dati letti da Store.loadStats(),
// aggregati per giorno (vedi Store.recordExecution).
// Struttura: header fisso (indietro + titolo), main scorrevole.

// Conta i giorni consecutivi presenti in daysObj (chiavi 'YYYY-MM-DD'),
// partendo da oggi; se oggi non e' ancora presente si parte da ieri, cosi'
// lo streak non si azzera solo perche' la routine non e' ancora stata
// svolta oggi.
function computeStreak(daysObj) {
  if (!daysObj) { return 0; }
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var toKey = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!daysObj[toKey(cursor)]) { cursor.setDate(cursor.getDate() - 1); }
  var streak = 0;
  while (daysObj[toKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

Vue.component('stats-page', {
  data: function () {
    return {
      routines: Store.load().routines,
      stats: Store.loadStats(),
      selectedRoutineId: null,
      historyDaysToShow: 14
    };
  },
  computed: {
    routineSummaries: function () {
      var self = this;
      return this.routines.map(function (r) {
        var rs = self.stats.routines[r.id];
        var summary = { id: r.id, name: r.name, todaySeconds: 0, streak: 0, avgSeconds: 0, hasData: !!rs };
        if (rs) {
          var todayKey = Store.todayDateStr();
          if (rs.days[todayKey]) { summary.todaySeconds = rs.days[todayKey].totalSeconds; }
          summary.streak = computeStreak(rs.days);
          var totalSeconds = 0, executionsCount = 0;
          Object.keys(rs.days).forEach(function (k) {
            totalSeconds += rs.days[k].totalSeconds;
            executionsCount += rs.days[k].executionsCount;
          });
          summary.avgSeconds = executionsCount > 0 ? totalSeconds / executionsCount : 0;
        }
        return summary;
      });
    },
    selectedRoutine: function () {
      var id = this.selectedRoutineId;
      var found = this.routines.filter(function (r) { return r.id === id; });
      return found.length ? found[0] : null;
    },
    selectedRoutineStats: function () {
      return this.selectedRoutineId ? (this.stats.routines[this.selectedRoutineId] || null) : null;
    },
    selectedTotals: function () {
      var rs = this.selectedRoutineStats;
      if (!rs) { return null; }
      var totalSeconds = 0, executionsCount = 0, completedCount = 0, skippedCount = 0;
      Object.keys(rs.days).forEach(function (dk) {
        var day = rs.days[dk];
        totalSeconds += day.totalSeconds;
        executionsCount += day.executionsCount;
        Object.keys(day.tasks).forEach(function (tid) {
          completedCount += day.tasks[tid].completedCount;
          skippedCount += day.tasks[tid].skippedCount;
        });
      });
      var totalOcc = completedCount + skippedCount;
      return {
        totalSeconds: totalSeconds,
        executionsCount: executionsCount,
        avgSeconds: executionsCount > 0 ? totalSeconds / executionsCount : 0,
        completionPct: totalOcc > 0 ? Math.round((completedCount / totalOcc) * 100) : null,
        streak: computeStreak(rs.days)
      };
    },
    selectedTaskRows: function () {
      var rs = this.selectedRoutineStats;
      if (!rs) { return []; }
      var agg = {};
      Object.keys(rs.days).forEach(function (dk) {
        var day = rs.days[dk];
        Object.keys(day.tasks).forEach(function (tid) {
          var t = day.tasks[tid];
          if (!agg[tid]) { agg[tid] = { id: tid, name: t.name, completedSeconds: 0, completedCount: 0, estimatedSecondsSum: 0, skippedCount: 0 }; }
          agg[tid].name = t.name;
          agg[tid].completedSeconds += t.completedSeconds;
          agg[tid].completedCount += t.completedCount;
          agg[tid].estimatedSecondsSum += t.estimatedSecondsSum;
          agg[tid].skippedCount += t.skippedCount;
        });
      });
      return Object.keys(agg).map(function (tid) {
        var t = agg[tid];
        var avgReal = t.completedCount > 0 ? t.completedSeconds / t.completedCount : 0;
        var avgEstimated = t.completedCount > 0 ? t.estimatedSecondsSum / t.completedCount : 0;
        var totalOcc = t.completedCount + t.skippedCount;
        return {
          id: t.id, name: t.name,
          avgReal: avgReal, avgEstimated: avgEstimated,
          diffPct: avgEstimated > 0 ? Math.round(((avgReal - avgEstimated) / avgEstimated) * 100) : null,
          completedCount: t.completedCount, skippedCount: t.skippedCount,
          completionPct: totalOcc > 0 ? Math.round((t.completedCount / totalOcc) * 100) : null
        };
      });
    },
    recentDays: function () {
      var rs = this.selectedRoutineStats;
      if (!rs) { return []; }
      var keys = Object.keys(rs.days).sort().reverse();
      return keys.slice(0, this.historyDaysToShow).map(function (k) {
        var day = rs.days[k];
        return { date: k, totalSeconds: day.totalSeconds, executionsCount: day.executionsCount };
      });
    },
    recentDaysMax: function () {
      var max = 1;
      this.recentDays.forEach(function (d) { if (d.totalSeconds > max) { max = d.totalSeconds; } });
      return max;
    }
  },
  methods: {
    back: function () { this.$emit('back'); },
    selectRoutine: function (id) {
      this.selectedRoutineId = this.selectedRoutineId === id ? null : id;
    },
    fmtDuration: function (seconds) { return Store.formatDuration(seconds); },
    fmtDay: function (dateStr) {
      var parts = dateStr.split('-');
      return parts[2] + '/' + parts[1];
    },
    barWidthPct: function (seconds) {
      return Math.round((seconds / this.recentDaysMax) * 100);
    }
  },
  created: function () {
    this.Store = Store;
  },
  template:
    '<div>' +

      '<div class="fixed-top d-flex align-items-center px-3 border-bottom" style="height:56px;z-index:1050;" :class="$root.theme === \'dark\' ? \'bg-dark text-light\' : \'bg-white text-dark\'">' +
        '<button type="button" class="btn btn-outline-secondary mr-2" @click="back"><i class="mdi mdi-arrow-left"></i></button>' +
        '<span class="h5 mb-0">Statistiche</span>' +
      '</div>' +

      '<div class="container" style="padding-top:72px;padding-bottom:24px;">' +

        '<div v-if="routines.length === 0" class="text-muted text-center border rounded p-4 mb-2">' +
          'Nessuna routine ancora creata.' +
        '</div>' +

        '<ul class="list-group mb-3">' +
          '<li class="list-group-item" style="cursor:pointer;" v-for="r in routineSummaries" :key="r.id" @click="selectRoutine(r.id)">' +
            '<div class="d-flex justify-content-between align-items-center">' +
              '<strong>{{ r.name }}</strong>' +
              '<i class="mdi" :class="selectedRoutineId === r.id ? \'mdi-chevron-up\' : \'mdi-chevron-down\'"></i>' +
            '</div>' +
            '<div class="text-muted small" v-if="r.hasData">' +
              'Oggi: {{ fmtDuration(r.todaySeconds) }} &middot; Media a esecuzione: {{ fmtDuration(r.avgSeconds) }} &middot; ' +
              '<i class="mdi mdi-fire"></i> {{ r.streak }} ' + '{{ r.streak === 1 ? "giorno" : "giorni" }}' +
            '</div>' +
            '<div class="text-muted small" v-else>Nessun dato ancora disponibile.</div>' +

            '<div class="mt-3" v-if="selectedRoutineId === r.id && selectedTotals" @click.stop>' +

              '<div class="row text-center mb-3">' +
                '<div class="col-3"><div class="h6 mb-0">{{ fmtDuration(selectedTotals.totalSeconds) }}</div><small class="text-muted">Totale</small></div>' +
                '<div class="col-3"><div class="h6 mb-0">{{ selectedTotals.executionsCount }}</div><small class="text-muted">Esecuzioni</small></div>' +
                '<div class="col-3"><div class="h6 mb-0">{{ fmtDuration(selectedTotals.avgSeconds) }}</div><small class="text-muted">Media</small></div>' +
                '<div class="col-3"><div class="h6 mb-0">{{ selectedTotals.completionPct !== null ? selectedTotals.completionPct + "%" : "--" }}</div><small class="text-muted">Completati</small></div>' +
              '</div>' +

              '<h6 class="font-weight-bold">Task</h6>' +
              '<div class="table-responsive mb-3">' +
                '<table class="table table-sm">' +
                  '<thead><tr><th>Task</th><th>Media reale</th><th>Media stimata</th><th>Compl. / Salt.</th></tr></thead>' +
                  '<tbody>' +
                    '<tr v-for="t in selectedTaskRows" :key="t.id">' +
                      '<td>{{ t.name }}</td>' +
                      '<td>{{ fmtDuration(t.avgReal) }}</td>' +
                      '<td>{{ fmtDuration(t.avgEstimated) }} <small class="text-muted" v-if="t.diffPct !== null">({{ t.diffPct > 0 ? "+" : "" }}{{ t.diffPct }}%)</small></td>' +
                      '<td>{{ t.completedCount }} / {{ t.skippedCount }}</td>' +
                    '</tr>' +
                  '</tbody>' +
                '</table>' +
              '</div>' +

              '<h6 class="font-weight-bold">Ultimi giorni</h6>' +
              '<div class="mb-2" v-for="d in recentDays" :key="d.date">' +
                '<div class="d-flex justify-content-between small mb-1">' +
                  '<span>{{ fmtDay(d.date) }} &middot; {{ d.executionsCount }} esec.</span>' +
                  '<span>{{ fmtDuration(d.totalSeconds) }}</span>' +
                '</div>' +
                '<div class="progress" style="height:6px;">' +
                  '<div class="progress-bar" role="progressbar" :style="{width: barWidthPct(d.totalSeconds) + \'%\'}"></div>' +
                '</div>' +
              '</div>' +

            '</div>' +

          '</li>' +
        '</ul>' +

      '</div>' +

    '</div>'
});
