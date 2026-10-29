
/*
 * बाल पाठशाला — Gemini AI Voice Controller
 * Voice runs only on the home page and approved existing lessons.
 * Browser speech fallback is disabled.
 */

(() => {
  "use strict";

  const VOICE_WORKER =
    "https://bal-pathshala-voice.gckamal67.workers.dev";

  // Relative page paths, independent of the deployment folder.
  const ALLOWED_PAGES = new Set([
    "index.html",
    "nepali/vowels.html",
    "nepali/consonants.html",
    "nepali/barahakhari.html",
    "english/alphabet.html"
  ]);

  let currentAudio = null;
  let currentAudioUrl = null;
  let activeController = null;
  let requestNumber = 0;

  function getRelativePagePath() {
    const pathname = window.location.pathname;
    const scopePath = new URL(
      "./",
      window.location.href
    ).pathname;

    // Strip the current directory prefix where possible.
    let relative = pathname.startsWith(scopePath)
      ? pathname.slice(scopePath.length)
      : pathname.replace(/^\/+/, "");

    relative = relative.replace(/\/+$/, "");

    // A directory URL is treated as its index page.
    return relative || "index.html";
  }

  function isVoiceAllowedHere() {
    return ALLOWED_PAGES.has(getRelativePagePath());
  }

  function stopBrowserSpeech() {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {
        // Browser speech is intentionally disabled.
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
    stopBrowserSpeech();

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
          // The error response may not be JSON.
        }

        throw new Error(
          "Voice service failed (" +
          response.status +
          ")" +
          details
        );
      }

      const blob = await response.blob();

      if (id !== requestNumber) return false;

      if (!blob.size) {
        throw new Error("The voice service returned empty audio.");
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

      audio.onerror = () => {
        if (id !== requestNumber) return;

        console.error("Voice audio playback failed.");
        finish();
      };

      try {
        await audio.play();
        return true;
      } catch (error) {
        if (id !== requestNumber) return false;

        console.error("Voice playback failed:", error);
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
        "Voice service failed. Browser speech fallback is disabled:",
        error
      );

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

  // Preserve compatibility with existing lesson pages.
  window.playVoice = playVoice;
  window.playAIVoice = playVoice;
  window.stopVoice = stopVoice;
  window.isGeminiVoiceAllowed = isVoiceAllowedHere;

  window.addEventListener("pagehide", stopVoice);
})();
