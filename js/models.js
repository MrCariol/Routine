// models.js
// Fabbriche per creare routine/task/sotto-task vuoti e funzioni di calcolo
// (durata totale, orario di inizio/fine dedotto).

var Models = {

  newTask: function () {
    return {
      id: Store.uid(),
      name: '',
      icon: 'mdi-check-circle-outline',
      color: Store.ICON_COLORS[9].hex, // azzurro di default
      hours: 0,
      minutes: 5,
      seconds: 0,
      description: '',
      subtasks: [],
      autoComplete: false // di default sempre manuale
    };
  },

  newSubtask: function (name) {
    return { id: Store.uid(), name: name || '' };
  },

  newRoutine: function () {
    return {
      id: Store.uid(),
      name: '',
      timeMode: 'none', // 'none' | 'start' | 'end'
      timeValue: '07:00',
      tasks: []
    };
  },

  taskDurationSeconds: function (task) {
    var h = parseInt(task.hours, 10) || 0;
    var m = parseInt(task.minutes, 10) || 0;
    var s = parseInt(task.seconds, 10) || 0;
    return h * 3600 + m * 60 + s;
  },

  routineDurationSeconds: function (routine) {
    var total = 0;
    for (var i = 0; i < routine.tasks.length; i++) {
      total += this.taskDurationSeconds(routine.tasks[i]);
    }
    return total;
  },

  // Ritorna { start: 'HH:MM'|null, end: 'HH:MM'|null } calcolando quello mancante
  computeRoutineTimes: function (routine) {
    var durationMin = Math.round(this.routineDurationSeconds(routine) / 60);
    if (routine.timeMode === 'start' && routine.timeValue) {
      var startMin = Store.hhmmToMinutes(routine.timeValue);
      return { start: routine.timeValue, end: Store.minutesToHHMM(startMin + durationMin) };
    }
    if (routine.timeMode === 'end' && routine.timeValue) {
      var endMin = Store.hhmmToMinutes(routine.timeValue);
      return { start: Store.minutesToHHMM(endMin - durationMin), end: routine.timeValue };
    }
    return { start: null, end: null };
  }

};
