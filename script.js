
/*
 * बाल पाठशाला — Gemini AI Voice System
 * Cloudflare Worker + Gemini TTS
 * Browser/mobile voice fallback disabled
 */

(function () {
  "use strict";

  const VOICE_WORKER =
    "https://bal-pathshala-voice.gckamal67.workers.dev";

  let currentAudio = null;
  let currentAudioUrl = null;
  let activeController = null;
  let requestNumber = 0;

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
    const text = String(
      textToSpeak == null ? "" : textToSpeak
    ).trim();

    if (!text) {
      if (typeof callback === "function") callback();
      return;
    }

    const id = ++requestNumber;

    // Stop the previous request and audio.
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
        body: JSON.stringify({ text: text }),
        signal: controller.signal
      });

      if (id !== requestNumber) return;

      if (!response.ok) {
        let details = "";

        try {
          const data = await response.json();
          if (data && data.error) {
            details = ": " + data.error;
          }
        } catch (_) {}

        throw new Error(
          "Gemini Worker failed (" +
          response.status +
          ")" +
          details
        );
      }

      const blob = await response.blob();

      if (id !== requestNumber) return;

      if (!blob.size) {
        throw new Error("Gemini returned an empty audio file.");
      }

      if (
        blob.type &&
        !/^audio\//i.test(blob.type) &&
        blob.type !== "application/octet-stream"
      ) {
        throw new Error(
          "Worker returned unexpected content type: " +
          blob.type
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

        console.error(
          "Gemini audio playback failed."
        );

        finish();
      };

      try {
        await audio.play();
      } catch (error) {
        if (id !== requestNumber) return;

        console.error(
          "Gemini audio could not play:",
          error
        );

        finish();
      }
    } catch (error) {
      if (id !== requestNumber) return;

      if (error && error.name === "AbortError") {
        return;
      }

      activeController = null;

      console.error(
        "Gemini voice failed. Browser voice fallback is disabled:",
        error
      );

      // IMPORTANT:
      // Do not call speechSynthesis or browserSpeak here.
      // Gemini failure must never switch to mobile voice.
      finishCallback(callback, id);
    }
  }

  function stopVoice() {
    requestNumber++;

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseCurrentAudio();

    // Stop any browser speech left over from an older script.
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
