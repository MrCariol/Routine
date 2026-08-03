// sound.js
// Genera segnali acustici (bip) con la Web Audio API, onda quadra.
// Nessun file audio necessario: tutto generato al volo.

window.RoutineSound = (function () {
  var ctx = null;

  function getContext() {
    if (!ctx) {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) { return null; }
      try { ctx = new AudioCtor(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended' && ctx.resume) {
      try { ctx.resume(); } catch (e) {}
    }
    return ctx;
  }

  // Da chiamare durante un vero tocco dell'utente (es. "Avvia routine"),
  // cosi' l'audio e' pronto/sbloccato quando servira' piu' avanti dal timer.
  function unlock() {
    getContext();
  }

  // Riproduce un singolo bip a onda quadra, con una breve rampa di
  // volume in entrata/uscita per evitare click/scatti udibili.
  function tone(freq, durationMs) {
    var audioCtx = getContext();
    if (!audioCtx) { return; }
    var now = audioCtx.currentTime;
    var dur = durationMs / 1000;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    var peak = 0.18;
    var ramp = Math.min(0.01, dur / 4);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + ramp);
    gain.gain.setValueAtTime(peak, Math.max(now + ramp, now + dur - ramp));
    gain.gain.linearRampToValueAtTime(0, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Riproduce piu' bip distribuiti su una durata totale (es. 5 bip in 0.5s).
  function pattern(freq, count, totalMs, dutyRatio) {
    dutyRatio = dutyRatio || 0.5;
    var slot = totalMs / count;
    var onTime = slot * dutyRatio;
    for (var i = 0; i < count; i++) {
      (function (delay) {
        setTimeout(function () { tone(freq, onTime); }, delay);
      })(i * slot);
    }
  }

  return {
    unlock: unlock,
    tone: tone,
    pattern: pattern
  };
})();
