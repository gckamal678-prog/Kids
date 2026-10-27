
/*
 * बाल पाठशाला — AI Voice System
 * Gemini TTS + Cloudflare Worker
 * Nepali and English support
 */

(function () {
  "use strict";

  const VOICE_WORKER =
    "https://bal-pathshala-voice.gckamal67.workers.dev";

  let currentAudio = null;
  let currentAudioUrl = null;
  let requestNumber = 0;

  function releaseCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio = null;
    }

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
  }

  function browserSpeak(text, callback, id) {
    if (id !== requestNumber) return;

    if (!("speechSynthesis" in window)) {
      if (typeof callback === "function") callback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const nepali = /[\u0900-\u097F]/.test(text);

    utterance.lang = nepali ? "ne-NP" : "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const voice = voices.find(function (item) {
      return nepali
        ? /^ne([-_]|$)/i.test(item.lang)
        : /^en([-_]|$)/i.test(item.lang);
    });

    if (voice) utterance.voice = voice;

    let finished = false;

    function finish() {
      if (finished || id !== requestNumber) return;

      finished = true;

      if (typeof callback === "function") {
        callback();
      }
    }

    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn("Browser voice error:", error);
      finish();
    }
  }

  async function playVoice(textToSpeak, callback) {
    const text = String(
      textToSpeak == null ? "" : textToSpeak
    ).trim();

    if (!text) {
      if (typeof callback === "function") callback();
      return;
    }

    const id = ++requestNumber;

    releaseCurrentAudio();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Try Gemini AI voice through Cloudflare Worker.
    try {
      const response = await fetch(VOICE_WORKER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text
        })
      });

      if (!response.ok) {
        throw new Error(
          "AI voice request failed: " + response.status
        );
      }

      const blob = await response.blob();

      if (!blob.size || id !== requestNumber) {
        return;
      }

      currentAudioUrl = URL.createObjectURL(blob);
      currentAudio = new Audio(currentAudioUrl);
      currentAudio.preload = "auto";

      let finished = false;

      function finish() {
        if (finished || id !== requestNumber) return;

        finished = true;
        releaseCurrentAudio();

        if (typeof callback === "function") {
          callback();
        }
      }

      currentAudio.onended = finish;

      currentAudio.onerror = function () {
        if (id !== requestNumber) return;

        releaseCurrentAudio();
        browserSpeak(text, callback, id);
      };

      try {
        await currentAudio.play();
      } catch (error) {
        if (id !== requestNumber) return;

        releaseCurrentAudio();
        browserSpeak(text, callback, id);
      }

      return;
    } catch (error) {
      if (id !== requestNumber) return;

      console.warn(
        "Gemini voice unavailable; using browser voice:",
        error
      );

      browserSpeak(text, callback, id);
    }
  }

  function stopVoice() {
    requestNumber++;

    releaseCurrentAudio();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Keep compatibility with existing learning pages.
  window.playVoice = playVoice;
  window.playAIVoice = function (text, callback) {
    return playVoice(text, callback);
  };
  window.stopVoice = stopVoice;
})();
