// components/execution.js
// Schermata separata per l'esecuzione di una routine.
// Struttura: header fisso (nome routine + fine + ferma), main scorrevole,
// footer fisso (indietro/pausa/completa/salta). Nessuna animazione.

Vue.component('execution-view', {
  props: {
    routine: { type: Object, default: null },
    resumeSession: { type: Object, default: null }
  },
  data: function () {
    return {
      session: null,
      nowTick: Date.now(),
      timerHandle: null,
      lastTickAt: Date.now()
    };
  },
  computed: {
    currentTask: function () {
      if (!this.session) { return null; }
      return this.session.tasks[this.session.currentIndex] || null;
    },
    isLastTask: function () {
      if (!this.session) { return true; }
      return this.session.currentIndex >= this.session.tasks.length - 1;
    },
    isFirstTask: function () {
      return !this.session || this.session.currentIndex === 0;
    },
    nextTask: function () {
      if (!this.session || this.isLastTask) { return null; }
      return this.session.tasks[this.session.currentIndex + 1];
    },
    pendingTasks: function () {
      if (!this.session) { return []; }
      return this.session.tasks.slice(this.session.currentIndex + 1);
    },
    elapsedInCurrent: function () {
      var t = this.currentTask;
      if (!t) { return 0; }
      return t.totalSeconds - t.remainingSeconds;
    },
    progressRatio: function () {
      var t = this.currentTask;
      if (!t || t.totalSeconds <= 0) { return 1; }
      var r = this.elapsedInCurrent / t.totalSeconds;
      if (r < 0) { r = 0; }
      if (r > 1) { r = 1; }
      return r;
    },
    isOvertime: function () {
      return this.currentTask && this.currentTask.remainingSeconds < 0;
    },
    dashOffset: function () {
      var circumference = 2 * Math.PI * 54;
      return circumference * (1 - this.progressRatio);
    },
    circumference: function () { return 2 * Math.PI * 54; },
    remainingLabel: function () {
      var t = this.currentTask;
      if (!t) { return ''; }
      if (t.remainingSeconds >= 0) { return Store.formatClock(t.remainingSeconds); }
      return '+' + Store.formatClock(-t.remainingSeconds);
    },
    currentDurationLabel: function () {
      var t = this.currentTask;
      if (!t) { return ''; }
      var s = t.totalSeconds;
      var h = Math.floor(s / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      if (h > 0) { return h + 'h' + (m > 0 ? ' ' + m + 'm' : ''); }
      if (m > 0) { return m + 'm' + (sec > 0 ? ' ' + sec + 's' : ''); }
      return sec + 's';
    },
    currentTaskEndDate: function () {
      this.nowTick; // dipendenza reattiva
      var t = this.currentTask;
      if (!t) { return null; }
      return new Date(Date.now() + Math.max(0, t.remainingSeconds) * 1000);
    },
    currentTaskStartDate: function () {
      var t = this.currentTask;
      var end = this.currentTaskEndDate;
      if (!t || !end) { return null; }
      return new Date(end.getTime() - t.totalSeconds * 1000);
    },
    routineEndDate: function () {
      this.nowTick;
      if (!this.session) { return null; }
      var t = this.currentTask;
      var base = Date.now() + (t ? Math.max(0, t.remainingSeconds) * 1000 : 0);
      var rest = this.pendingTasks.reduce(function (sum, task) { return sum + task.totalSeconds; }, 0);
      return new Date(base + rest * 1000);
    }
  },
  methods: {
    fmtTime: function (d) {
      if (!d) { return '--:--'; }
      var h = d.getHours() < 10 ? '0' + d.getHours() : '' + d.getHours();
      var m = d.getMinutes() < 10 ? '0' + d.getMinutes() : '' + d.getMinutes();
      return h + ':' + m;
    },
    buildSessionFromRoutine: function (routine) {
      var clonedTasks = routine.tasks.map(function (t) {
        var total = Models.taskDurationSeconds(t);
        return {
          id: t.id, name: t.name, icon: t.icon, color: t.color,
          description: t.description, autoComplete: t.autoComplete,
          totalSeconds: total, remainingSeconds: total, elapsedSeconds: 0,
          status: 'pending',
          subtasks: t.subtasks.map(function (s) { return { id: s.id, name: s.name, checked: false }; })
        };
      });
      return {
        routineId: routine.id,
        routineName: routine.name,
        tasks: clonedTasks,
        currentIndex: 0,
        paused: false
      };
    },
    startTimer: function () {
      var self = this;
      this.lastTickAt = Date.now();
      if (this.timerHandle) { clearInterval(this.timerHandle); }
      this.timerHandle = setInterval(function () { self.tick(); }, 1000);
    },
    tick: function () {
      var now = Date.now();
      // Il tempo reale trascorso da un tick all'altro non e' sempre 1
      // secondo: se il browser va in background o lo schermo si blocca, i
      // timer vengono sospesi/rallentati. Calcolando il delta reale invece
      // di sottrarre sempre 1, quando si torna sulla pagina il tempo si
      // aggiorna subito correttamente invece di sembrare fermo.
      var deltaSeconds = Math.max(0, Math.round((now - (this.lastTickAt || now)) / 1000));
      this.lastTickAt = now;
      this.nowTick = now;
      if (!this.session || this.session.paused) { return; }
      if (deltaSeconds <= 0) { return; }
      var t = this.currentTask;
      if (!t) { return; }
      var oldRemaining = t.remainingSeconds;
      t.remainingSeconds -= deltaSeconds;
      t.elapsedSeconds += deltaSeconds;
      this.playThresholdSound(oldRemaining, t.remainingSeconds);
      if (t.remainingSeconds <= 0 && t.autoComplete) {
        this.advance('completed');
        return;
      }
      this.persist();
    },
    playThresholdSound: function (oldRemaining, newRemaining) {
      function crossedDown(threshold) { return oldRemaining > threshold && newRemaining <= threshold; }
      if (crossedDown(300)) { RoutineSound.pattern(700, 5, 500, 0.5); return; }
      if (crossedDown(120)) { RoutineSound.pattern(850, 2, 1000, 0.6); return; }
      if (crossedDown(60)) { RoutineSound.tone(1000, 1000); return; }
      if (crossedDown(0)) { RoutineSound.pattern(1300, 8, 2000, 0.5); return; }
      if (newRemaining < 0 && oldRemaining < 0) {
        var oldMinutesOver = Math.floor(-oldRemaining / 60);
        var newMinutesOver = Math.floor(-newRemaining / 60);
        if (newMinutesOver > oldMinutesOver) { RoutineSound.tone(1000, 1000); }
      }
    },
    onVisibilityChange: function () {
      if (!document.hidden) {
        // Ricalcola subito, senza aspettare il prossimo giro dell'interval,
        // cosi' il timer si aggiorna nell'istante in cui si torna sulla pagina.
        this.tick();
      }
    },
    togglePause: function () {
      if (!this.session) { return; }
      this.session.paused = !this.session.paused;
      this.persist();
    },
    completeCurrent: function () { this.advance('completed'); },
    skipCurrent: function () { this.advance('skipped'); },
    goBack: function () {
      if (!this.session || this.isFirstTask) { return; }
      this.session.currentIndex -= 1;
      this.session.tasks[this.session.currentIndex].status = 'pending';
      this.persist();
    },
    advance: function (status) {
      if (!this.session) { return; }
      this.session.tasks[this.session.currentIndex].status = status;
      if (this.isLastTask) {
        this.finish();
        return;
      }
      this.session.currentIndex += 1;
      this.persist();
    },
    finish: function () {
      var tasksSummary = this.session.tasks.map(function (t) {
        return {
          id: t.id, name: t.name, icon: t.icon, color: t.color,
          status: t.status, elapsedSeconds: t.elapsedSeconds
        };
      });
      var totalElapsed = tasksSummary.reduce(function (sum, t) { return sum + t.elapsedSeconds; }, 0);
      Store.saveExecution(null);
      this.$emit('finished', {
        routineName: this.session.routineName,
        totalElapsedSeconds: totalElapsed,
        tasks: tasksSummary
      });
    },
    stopRoutine: function () {
      var self = this;
      this.$root.askConfirm('Fermare completamente la routine corrente? I progressi di questa sessione andranno persi.', function () {
        Store.saveExecution(null);
        self.$emit('stopped');
      });
    },
    adjustDuration: function (deltaMinutes) {
      var t = this.currentTask;
      if (!t) { return; }
      var deltaSeconds = deltaMinutes * 60;
      var newTotal = t.totalSeconds + deltaSeconds;
      if (newTotal < 5) { newTotal = 5; }
      t.remainingSeconds += (newTotal - t.totalSeconds);
      t.totalSeconds = newTotal;
      this.persist();
    },
    toggleSubtask: function (subtask) {
      subtask.checked = !subtask.checked;
      this.persist();
    },
    persist: function () {
      Store.saveExecution(this.session);
    },
    openDurationAdjust: function () {
      $(this.$refs.durationAdjustModal).modal('show');
    }
  },
  created: function () {
    this.Store = Store;
    if (this.resumeSession) {
      var s = this.resumeSession;
      s.tasks.forEach(function (t) {
        if (typeof t.elapsedSeconds !== 'number') { t.elapsedSeconds = t.totalSeconds - t.remainingSeconds; }
        if (!t.status) { t.status = 'pending'; }
      });
      this.session = s;
    } else if (this.routine) {
      if (window.RoutineSound) {
        RoutineSound.unlock();
        RoutineSound.tone(600, 100);
      }
      this.session = this.buildSessionFromRoutine(this.routine);
      this.persist();
    }
    if (this.session) {
      this.startTimer();
      if (window.appNoSleep) { try { window.appNoSleep.enable(); } catch (e) {} }
      this._visibilityHandler = this.onVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }
  },
  beforeDestroy: function () {
    if (this.timerHandle) { clearInterval(this.timerHandle); }
    if (this._visibilityHandler) { document.removeEventListener('visibilitychange', this._visibilityHandler); }
    if (window.appNoSleep) { try { window.appNoSleep.disable(); } catch (e) {} }
  },
  template:
    '<div v-if="session">' +

      '<div class="fixed-top d-flex justify-content-between align-items-center px-3 border-bottom" style="height:56px;z-index:1050;" :class="$root.theme === \'dark\' ? \'bg-dark text-light\' : \'bg-white text-dark\'">' +
        '<h6 class="mb-0 text-truncate">{{ session.routineName }} <small class="text-muted">&middot; Fine: {{ fmtTime(routineEndDate) }}</small></h6>' +
        '<button class="btn btn-sm btn-outline-danger" @click="stopRoutine"><i class="mdi mdi-stop"></i> Ferma</button>' +
      '</div>' +

      '<div class="container" style="padding-top:72px;padding-bottom:88px;" v-if="currentTask">' +

        '<div class="text-center my-3">' +
          '<div class="position-relative d-inline-block">' +
            '<svg width="220" height="220" viewBox="0 0 120 120">' +
              '<circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="8"></circle>' +
              '<circle cx="60" cy="60" r="54" fill="none" ' +
                ':stroke="isOvertime ? \'#E74C3C\' : currentTask.color" stroke-width="8" stroke-linecap="round" ' +
                'transform="rotate(-90 60 60)" ' +
                ':style="{strokeDasharray: circumference, strokeDashoffset: dashOffset}">' +
              '</circle>' +
            '</svg>' +
            '<div class="position-absolute" style="top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
              '<i class="mdi mdi-36px mb-1" :class="currentTask.icon" :style="{color: currentTask.color}"></i>' +
              '<div class="h3 mb-0" :class="isOvertime ? \'text-danger\' : \'\'">{{ remainingLabel }}</div>' +
            '</div>' +
          '</div>' +

          '<h3 class="mt-3 mb-1">{{ currentTask.name }}</h3>' +
          '<p class="mb-2" v-if="currentTask.description">{{ currentTask.description }}</p>' +

          '<ul class="list-group text-left mb-2" v-if="currentTask.subtasks.length">' +
            '<li class="list-group-item" v-for="st in currentTask.subtasks" :key="st.id">' +
              '<div class="custom-control custom-checkbox">' +
                '<input type="checkbox" class="custom-control-input" :id="\'sub-\'+st.id" v-model="st.checked" @change="persist">' +
                '<label class="custom-control-label" :for="\'sub-\'+st.id" :class="st.checked ? \'text-muted\' : \'\'" :style="st.checked ? \'text-decoration:line-through;\' : \'\'">{{ st.name }}</label>' +
              '</div>' +
            '</li>' +
          '</ul>' +

          '<div class="d-flex align-items-center justify-content-center mb-3">' +
            '<span class="text-muted mr-2">{{ fmtTime(currentTaskStartDate) }}-{{ fmtTime(currentTaskEndDate) }} ({{ currentDurationLabel }})</span>' +
            '<button class="btn btn-sm btn-outline-secondary" @click="openDurationAdjust"><i class="mdi mdi-pencil"></i></button>' +
          '</div>' +

          '<div class="p-2 border rounded text-left">' +
            '<span class="text-muted">Prossimo: </span>' +
            '<strong>{{ nextTask ? nextTask.name : "Fine della routine" }}</strong>' +
          '</div>' +

        '</div>' +
      '</div>' +

      '<div class="fixed-bottom d-flex border-top" style="height:64px;z-index:1050;" :class="$root.theme === \'dark\' ? \'bg-dark\' : \'bg-white\'">' +
        '<button class="btn btn-outline-secondary flex-fill" style="border-radius:0;" @click="goBack" :disabled="isFirstTask"><i class="mdi mdi-skip-previous"></i></button>' +
        '<button class="btn btn-outline-warning flex-fill" style="border-radius:0;" @click="togglePause"><i class="mdi mdi-pause"></i></button>' +
        '<button class="btn btn-success flex-fill" style="border-radius:0;" @click="completeCurrent"><i class="mdi mdi-check"></i></button>' +
        '<button class="btn btn-outline-danger flex-fill" style="border-radius:0;" @click="skipCurrent"><i class="mdi mdi-skip-next"></i></button>' +
      '</div>' +

      '<div class="fixed-top vh-100 d-flex flex-column align-items-center justify-content-center" v-if="session.paused" style="z-index:1065;" :class="$root.theme === \'dark\' ? \'bg-dark text-light\' : \'bg-light text-dark\'">' +
        '<h3 class="mb-4">Routine in pausa!</h3>' +
        '<button class="btn btn-warning btn-lg" @click="togglePause"><i class="mdi mdi-play"></i> Riprendi</button>' +
      '</div>' +

      '<div class="modal" tabindex="-1" ref="durationAdjustModal" style="z-index:1075;">' +
        '<div class="modal-dialog" style="position:fixed;bottom:64px;left:0;right:0;margin:0;width:100%;max-width:100%;">' +
          '<div class="modal-content">' +
            '<div class="modal-header">' +
              '<h5 class="modal-title">Modifica durata task</h5>' +
              '<button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>' +
            '</div>' +
            '<div class="modal-body">' +
              '<div class="btn-group btn-group-lg btn-block d-flex" role="group">' +
                '<button class="btn btn-outline-secondary flex-fill" @click="adjustDuration(-5)">-5m</button>' +
                '<button class="btn btn-outline-secondary flex-fill" @click="adjustDuration(-1)">-1m</button>' +
                '<button class="btn btn-outline-secondary flex-fill" @click="adjustDuration(1)">+1m</button>' +
                '<button class="btn btn-outline-secondary flex-fill" @click="adjustDuration(5)">+5m</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>'
});
