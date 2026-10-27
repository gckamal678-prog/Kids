JavaScript

/*
 * बाल पाठशाला — Shared Voice Utilities
 * Stage 3
 *
 * Supports:
 * - playVoice(text, callback)
 * - playAIVoice(text, callback) for older pages
 * - stopVoice()
 * - Optional /api/tts endpoint with browser speech fallback
 */

(function () {
  "use strict";

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
      if (typeof callback === "function") callback();
    }

    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn("Browser voice could not start:", error);
      finish();
    }
  }

  async function playVoice(textToSpeak, callback) {
    const text = String(textToSpeak == null ? "" : textToSpeak).trim();
    if (!text) {
      if (typeof callback === "function") callback();
      return;
    }

    const id = ++requestNumber;
    releaseCurrentAudio();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Optional server-side text-to-speech.
    // If /api/tts is not deployed or fails, use browser speech.
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
      });

      if (!response.ok) {
        throw new Error("TTS endpoint returned " + response.status);
      }

      const blob = await response.blob();

      if (!blob.size || id !== requestNumber) return;

      currentAudioUrl = URL.createObjectURL(blob);
      currentAudio = new Audio(currentAudioUrl);
      currentAudio.preload = "auto";

      let finished = false;

      function finish() {
        if (finished || id !== requestNumber) return;
        finished = true;
        releaseCurrentAudio();
        if (typeof callback === "function") callback();
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
        releaseCurrentAudio();
        browserSpeak(text, callback, id);
      }

      return;
    } catch (error) {
      // Expected when the optional server endpoint is not configured.
      if (id !== requestNumber) return;
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

  // Preserve an existing implementation if another page defines one first.
  if (typeof window.playVoice !== "function") {
    window.playVoice = playVoice;
  }

  if (typeof window.playAIVoice !== "function") {
    window.playAIVoice = function (text, callback) {
      return window.playVoice(text, callback);
    };
  }

  if (typeof window.stopVoice !== "function") {
    window.stopVoice = stopVoice;
  }
})();
