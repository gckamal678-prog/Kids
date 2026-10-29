
/*
 * बाल पाठशाला — AI Voice Controller
 * सबै पाठमा आवाज, अडियो क्यास र वैकल्पिक ब्राउजर आवाज।
 */
(() => {
  "use strict";

  const VOICE_WORKER =
    "https://bal-pathshala-voice.gckamal67.workers.dev/";

  const audioCache = new Map();
  const MAX_CACHE = 60;

  let currentAudio = null;
  let currentAudioUrl = null;
  let activeController = null;
  let requestNumber = 0;

  function stopBrowserSpeech() {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
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

  function stopVoice() {
    requestNumber++;

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseCurrentAudio();
    stopBrowserSpeech();
  }

  function rememberAudio(text, blob) {
    audioCache.delete(text);
    audioCache.set(text, blob);

    while (audioCache.size > MAX_CACHE) {
      audioCache.delete(audioCache.keys().next().value);
    }
  }

  // AI आवाज असफल हुँदा ब्राउजरको आवाज प्रयोग गर्ने।
  function playBrowserSpeech(text) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve(false);
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = /[A-Za-z]/.test(text) ? "en-US" : "ne-NP";
        utterance.rate = 0.85;
        utterance.pitch = 1;

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        window.speechSynthesis.speak(utterance);
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function playVoice(textToSpeak, callback) {
    const text = String(textToSpeak ?? "").trim().slice(0, 500);
    if (!text) return false;

    stopBrowserSpeech();

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseCurrentAudio();

    const id = ++requestNumber;
    let blob = audioCache.get(text);

    try {
      if (!blob) {
        const controller = new AbortController();
        activeController = controller;

        // अनुरोध धेरै समय अड्किएमा रद्द गर्ने।
        const timeout = setTimeout(() => controller.abort(), 25000);

        let response;

        try {
          response = await fetch(VOICE_WORKER, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ text }),
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeout);
        }

        if (id !== requestNumber) return false;

        if (!response.ok) {
          throw new Error("Worker HTTP " + response.status);
        }

        blob = await response.blob();

        if (id !== requestNumber) return false;

        if (!blob.size) {
          throw new Error("Worker बाट खाली अडियो आयो।");
        }

        const type = (blob.type || "").toLowerCase();

        if (
          type &&
          !type.startsWith("audio/") &&
          !type.includes("octet-stream")
        ) {
          throw new Error("Worker ले अडियोको सट्टा अर्को सामग्री पठायो: " + type);
        }

        rememberAudio(text, blob);
      }

      if (id !== requestNumber) return false;

      activeController = null;
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

        if (typeof callback === "function") {
          try {
            callback();
          } catch (error) {
            console.warn("Voice callback error:", error);
          }
        }
      }

      audio.onended = finish;

      audio.onerror = async () => {
        if (id !== requestNumber || finished) return;

        finished = true;
        releaseCurrentAudio();

        console.warn("AI अडियो बजेन। ब्राउजर आवाज प्रयास गरिँदैछ।");
        await playBrowserSpeech(text);
      };

      try {
        await audio.play();
        return true;
      } catch (error) {
        if (id !== requestNumber) return false;

        releaseCurrentAudio();
        console.warn("AI अडियो प्ले हुन सकेन:", error);

        return await playBrowserSpeech(text);
      }
    } catch (error) {
      if (id !== requestNumber) return false;

      activeController = null;
      console.warn("AI आवाज अनुरोध असफल:", error);

      // AI सेवा असफल भए वैकल्पिक आवाज।
      return await playBrowserSpeech(text);
    }
  }

  window.playVoice = playVoice;
  window.playAIVoice = playVoice;
  window.stopVoice = stopVoice;

  // मुख्य पेजका सबै पाठमा आवाज बटन थप्ने।
  function addHomeVoiceButtons() {
    const grid = document.getElementById("book-grid");
    if (!grid) return;

    if (!document.getElementById("book-voice-style")) {
      const style = document.createElement("style");
      style.id = "book-voice-style";
      style.textContent = `
        .book-item {
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 6px;
          min-width: 0;
        }
        .book-speak {
          width: 100%;
          min-height: 42px;
          padding: 9px;
          border: 1px solid #cbd7ee;
          border-radius: 12px;
          background: #fff;
          color: #23458b;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }
        .book-speak:disabled {
          opacity: .7;
          cursor: wait;
        }
        body.dark-mode .book-speak {
          background: #1c2739;
          color: #dce7ff;
          border-color: #35435b;
        }
        .book-item[hidden] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    grid.querySelectorAll("a.book[data-category]").forEach(card => {
      if (card.closest(".book-item")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "book-item";

      card.parentNode.insertBefore(wrapper, card);
      wrapper.appendChild(card);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "book-speak";
      button.textContent = "🔊 पाठ सुनौँ";

      button.addEventListener("click", async () => {
        const title =
          card.querySelector("strong")?.textContent?.trim() || "";
        const description =
          card.querySelector("small")?.textContent?.trim() || "";
        const text = [title, description].filter(Boolean).join(". ");

        button.disabled = true;
        button.textContent = "⏳ आवाज तयार हुँदैछ…";

        try {
          const ok = await playVoice(text);

          button.textContent = ok
            ? "🔊 फेरि सुन्नुहोस्"
            : "🔁 फेरि प्रयास गर्नुहोस्";
        } catch (error) {
          console.error(error);
          button.textContent = "🔁 फेरि प्रयास गर्नुहोस्";
        } finally {
          button.disabled = false;
        }
      });

      wrapper.appendChild(button);
    });
  }

  // स्वागत आवाज बटन।
  function setupWelcomeButton() {
    const button = document.getElementById("voice-toggle");
    if (!button || button.dataset.voiceReady === "yes") return;

    button.dataset.voiceReady = "yes";

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "⏳ आवाज तयार हुँदैछ…";

      try {
        const ok = await playVoice(
          "बाल पाठशालामा स्वागत छ। आउनुहोस्, रमाउँदै नयाँ कुरा सिकौँ।"
        );

        button.textContent = ok
          ? "🔊 स्वागत आवाज फेरि सुन्नुहोस्"
          : "🔁 स्वागत आवाज फेरि प्रयास गर्नुहोस्";
      } finally {
        button.disabled = false;
      }
    });
  }

  function initializeVoice() {
    addHomeVoiceButtons();
    setupWelcomeButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeVoice);
  } else {
    initializeVoice();
  }

  window.addEventListener("pagehide", stopVoice);
})();
