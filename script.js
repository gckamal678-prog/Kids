
/*
 * बाल पाठशाला — Gemini AI Voice Controller
 * Gemini TTS through Cloudflare Worker.
 *
 * Voice allowed only on:
 * 1. Home page welcome message
 * 2. Nepali vowels, consonants and barahakhari
 * 3. English alphabet pages
 *
 * No browser speech fallback.
 */

(function () {
  "use strict";

  const VOICE_WORKER =
    "https://bal-pathshala-voice.gckamal67.workers.dev";

  const ALLOWED_PAGES = new Set([
    "/Kids/",
    "/Kids/index.html",
    "/",
    "/index.html",

    "/Kids/nepali/vowels.html",
    "/Kids/nepali/consonants.html",
    "/Kids/nepali/barahakhari.html",
    "/Kids/nepali/imagevowels.html",
    "/Kids/nepali/imageconsonants.html",

    "/Kids/english/alphabet.html",
    "/Kids/english/alphabet-image.html",

    "/nepali/vowels.html",
    "/nepali/consonants.html",
    "/nepali/barahakhari.html",
    "/nepali/imagevowels.html",
    "/nepali/imageconsonants.html",

    "/english/alphabet.html",
    "/english/alphabet-image.html"
  ]);

  let currentAudio = null;
  let currentAudioUrl = null;
  let activeController = null;
  let requestNumber = 0;

  function isVoiceAllowedHere() {
    const path = window.location.pathname;
    return ALLOWED_PAGES.has(path);
  }

  function stopBrowserSpeech() {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {
        // Browser voice is deliberately disabled.
      }
    }
  }

  function releaseCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.removeAttribute("src");
      currentAudio.load();
      currentAudio = null;
    }

    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
    }
  }

  function finishCallback(callback, id) {
    if (id !== requestNumber) return;

    if (typeof callback === "function") {
      try {
        callback();
      } catch (error) {
        console.error("Voice callback error:", error);
      }
    }
  }

  async function playVoice(textToSpeak, callback) {
    // Stop any legacy phone/browser speech.
    stopBrowserSpeech();

    // Do not permit voice on other learning pages.
    if (!isVoiceAllowedHere()) {
      stopVoice();
      return false;
    }

    const text = String(
      textToSpeak == null ? "" : textToSpeak
    ).trim();

    if (!text) {
      if (typeof callback === "function") callback();
      return false;
    }

    // Keep requests manageable and prevent accidental huge requests.
    const safeText = text.slice(0, 500);
    const id = ++requestNumber;

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseCurrentAudio();

    const controller = new AbortController();
    activeController = controller;

    try {
      const response = await fetch(VOICE_WORKER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: safeText }),
        signal: controller.signal
      });

      if (id !== requestNumber) return false;

      if (!response.ok) {
        let details = "";

        try {
          const data = await response.json();
          if (data && data.error) {
            details = ": " + data.error;
          }
        } catch (_) {
          // Response may not be JSON.
        }

        throw new Error(
          "Gemini Worker failed (" +
          response.status +
          ")" +
          details
        );
      }

      const blob = await response.blob();

      if (id !== requestNumber) return false;

      if (!blob.size) {
        throw new Error("Gemini returned an empty audio file.");
      }

      if (
        blob.type &&
        !/^audio\//i.test(blob.type) &&
        blob.type !== "application/octet-stream"
      ) {
        throw new Error(
          "Unexpected audio content type: " + blob.type
        );
      }

      currentAudioUrl = URL.createObjectURL(blob);

      const audio = new Audio(currentAudioUrl);
      currentAudio = audio;
      audio.preload = "auto";

      let finished = false;

      function finish() {
        if (finished || id !== requestNumber) return;

        finished = true;
        releaseCurrentAudio();
        activeController = null;
        finishCallback(callback, id);
      }

      audio.onended = finish;

      audio.onerror = function () {
        if (id !== requestNumber) return;

        console.error("Gemini audio playback failed.");
        finish();
      };

      try {
        await audio.play();
        return true;
      } catch (error) {
        if (id !== requestNumber) return false;

        console.error("Gemini audio could not play:", error);
        finish();
        return false;
      }
    } catch (error) {
      if (id !== requestNumber) return false;

      if (error && error.name === "AbortError") {
        return false;
      }

      activeController = null;

      console.error(
        "Gemini voice failed. Browser voice fallback is disabled:",
        error
      );

      // Never fall back to Android or browser speech.
      finishCallback(callback, id);
      return false;
    }
  }

  function stopVoice() {
    requestNumber++;

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseCurrentAudio();
    stopBrowserSpeech();
  }

  // Compatibility with existing allowed learning pages.
  window.playVoice = playVoice;
  window.playAIVoice = playVoice;
  window.stopVoice = stopVoice;

  // Useful for testing which page is permitted to use Gemini voice.
  window.isGeminiVoiceAllowed = isVoiceAllowedHere;

  // Stop audio when the user leaves the page.
  window.addEventListener("pagehide", stopVoice);
})();
