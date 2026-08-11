// voice.js
// Annunci vocali con la Web Speech API (SpeechSynthesis). Stesso approccio
// di sound.js: modulo standalone, feature-detection, no-op silenzioso se
// l'API non e' disponibile (nessun file audio, nessuna dipendenza esterna).

window.RoutineVoice = (function () {
  var keepAliveHandle = null;
  // Riferimenti alle utterance ancora "in volo": Chrome ha un bug noto per
  // cui, se l'unico riferimento a una SpeechSynthesisUtterance e' quello
  // locale alla funzione che l'ha creata, il garbage collector puo'
  // raccoglierla prima che finisca di essere pronunciata, interrompendo
  // l'audio senza errori. Tenerne un riferimento qui (rimosso a fine
  // pronuncia) evita il problema.
  var pending = [];

  function getSynth() {
    return window.speechSynthesis || null;
  }

  function supported() {
    return !!getSynth();
  }

  // Su alcuni browser il caricamento asincrono delle voci parte solo dopo la
  // prima chiamata a getVoices(): la invochiamo subito al caricamento del
  // modulo per anticipare il piu' possibile il momento in cui sono pronte.
  (function primeVoices() {
    var synth = getSynth();
    if (synth) { try { synth.getVoices(); } catch (e) {} }
  })();

  function retain(u) {
    pending.push(u);
    var release = function () {
      var idx = pending.indexOf(u);
      if (idx !== -1) { pending.splice(idx, 1); }
    };
    u.onend = release;
    u.onerror = release;
  }

  // Su Android/Chrome l'elenco delle voci si carica in modo asincrono dopo
  // il caricamento della pagina (a volte con centinaia di ms di ritardo):
  // se speak() viene chiamato prima che siano pronte, la pronuncia fallisce
  // in silenzio (nessun errore, nessun audio). Aspetta che getVoices()
  // restituisca almeno una voce prima di procedere (con un tetto massimo,
  // cosi' non resta bloccato per sempre se le voci non arrivano mai).
  function waitForVoices(callback, attemptsLeft) {
    if (attemptsLeft === undefined) { attemptsLeft = 20; }
    var synth = getSynth();
    if (!synth) { return; }
    if (synth.getVoices().length > 0 || attemptsLeft <= 0) { callback(); return; }
    setTimeout(function () { waitForVoices(callback, attemptsLeft - 1); }, 100);
  }

  function speakSilent(synth) {
    try {
      var u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'it-IT';
      retain(u);
      synth.speak(u);
    } catch (e) {}
  }

  // Da chiamare durante un vero tocco dell'utente, come RoutineSound.unlock.
  // Oltre a sbloccare la sintesi vocale, pronuncia subito un'utterance
  // silenziosa per "risvegliare" il motore TTS: su Android/Chrome, se il
  // motore resta inattivo per un po', la chiamata successiva a speak() parte
  // con qualche secondo di ritardo percepibile.
  function unlock() {
    var synth = getSynth();
    if (!synth) { return; }
    try { synth.cancel(); } catch (e) {}
    speakSilent(synth);
  }

  // Mantiene "sveglio" il motore TTS mentre e' attiva una routine in
  // modalita' voce, pronunciando periodicamente un'utterance silenziosa:
  // senza questo, dopo qualche minuto senza annunci (soglie distanti tra
  // loro) il primo annuncio successivo puo' partire con alcuni secondi di
  // ritardo su alcuni dispositivi mobili.
  function startKeepAlive() {
    var synth = getSynth();
    if (!synth || keepAliveHandle) { return; }
    keepAliveHandle = setInterval(function () { speakSilent(synth); }, 10000);
  }

  function stopKeepAlive() {
    if (keepAliveHandle) { clearInterval(keepAliveHandle); keepAliveHandle = null; }
  }

  function doSpeak(text, append) {
    var synth = getSynth();
    if (!synth) { return; }
    try {
      if (!append) { synth.cancel(); }
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT';
      retain(u);
      synth.speak(u);
    } catch (e) {}
  }

  // Se "append" e' true, l'annuncio si accoda a uno gia' in corso invece di
  // interromperlo (usato per non tagliare l'annuncio di soglia quando viene
  // subito seguito dall'annuncio del nuovo task che inizia).
  function speak(text, append) {
    var synth = getSynth();
    if (!synth) { return; }
    if (synth.getVoices().length > 0) {
      doSpeak(text, append);
      return;
    }
    waitForVoices(function () { doSpeak(text, append); });
  }

  return {
    supported: supported,
    unlock: unlock,
    speak: speak,
    startKeepAlive: startKeepAlive,
    stopKeepAlive: stopKeepAlive
  };
})();
