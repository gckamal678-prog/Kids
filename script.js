
/*
 * बाल पाठशाला — सुधारिएको AI Voice Controller
 * पाठका कार्ड थिच्दा आवाज, र दोहोरिएको आवाजका लागि cache।
 */
(() => {
  "use strict";

  const VOICE_WORKER =
    "https://bal-pathshala-voice.gckamal67.workers.dev";

  const ALLOWED_SUFFIXES = [
    "/nepali/vowels.html",
    "/nepali/consonants.html",
    "/nepali/barahakhari.html",
    "/english/alphabet.html"
  ];

  let currentAudio = null;
  let currentAudioUrl = null;
  let activeController = null;
  let requestNumber = 0;

  // हालको पेजको ठेगाना सही तरिकाले जाँच्ने।
  function isVoiceAllowedHere() {
    const path = window.location.pathname
      .replace(/\/+$/, "") || "/";

    if (
      path === "/" ||
      path.endsWith("/index.html") ||
      path.endsWith("/Kids")
    ) {
      return true;
    }

    return ALLOWED_SUFFIXES.some(suffix =>
      path.endsWith(suffix)
    );
  }

  // पहिले तयार भएको आवाज सम्झिराख्ने।
  const audioCache = new Map();
  const MAX_CACHE = 60;

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
    if (audioCache.has(text)) {
      audioCache.delete(text);
    }

    audioCache.set(text, blob);

    while (audioCache.size > MAX_CACHE) {
      const oldestKey = audioCache.keys().next().value;
      audioCache.delete(oldestKey);
    }
  }

  async function playVoice(textToSpeak, callback) {
    stopBrowserSpeech();

    if (!isVoiceAllowedHere()) {
      stopVoice();
      return false;
    }

    const text = String(textToSpeak ?? "").trim();
    if (!text) return false;

    const safeText = text.slice(0, 500);
    const id = ++requestNumber;

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseCurrentAudio();

    try {
      let blob = audioCache.get(safeText);

      // क्यासमा नभए मात्र AI सेवाबाट आवाज ल्याउने।
      if (!blob) {
        const controller = new AbortController();
        activeController = controller;

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
          throw new Error("Voice service error: " + response.status);
        }

        blob = await response.blob();

        if (id !== requestNumber) return false;
        if (!blob.size) {
          throw new Error("खाली अडियो प्राप्त भयो।");
        }

        if (
          blob.type &&
          !/^audio\//i.test(blob.type) &&
          blob.type !== "application/octet-stream"
        ) {
          throw new Error("अडियोको प्रकार मिलेन: " + blob.type);
        }

        rememberAudio(safeText, blob);
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
            console.warn("Voice callback:", error);
          }
        }
      }

      audio.onended = finish;

      audio.onerror = () => {
        if (id === requestNumber) {
          console.warn("अडियो बजाउन सकिएन।");
          finish();
        }
      };

      await audio.play();
      return true;

    } catch (error) {
      if (id !== requestNumber) return false;

      activeController = null;

      if (error?.name !== "AbortError") {
        console.error("AI आवाज चलाउन समस्या:", error);
      }

      return false;
    }
  }

  window.playVoice = playVoice;
  window.playAIVoice = playVoice;
  window.stopVoice = stopVoice;
  window.isGeminiVoiceAllowed = isVoiceAllowedHere;

  // मुख्य पेजका प्रत्येक पाठमा छुट्टै आवाज बटन थप्ने।
  function addHomeVoiceButtons() {
    const grid = document.getElementById("book-grid");
    if (!grid) return;

    const style = document.createElement("style");
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
        padding: 8px;
        border: 1px solid #cbd7ee;
        border-radius: 12px;
        background: #fff;
        color: #23458b;
        font: inherit;
        font-weight: 750;
        cursor: pointer;
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
        const title = card.querySelector("strong")?.textContent || "";
        const description = card.querySelector("small")?.textContent || "";

        button.disabled = true;
        button.textContent = "⏳ आवाज तयार हुँदैछ…";

        try {
          const ok = await playVoice(`${title}. ${description}`);
          if (!ok) {
            button.textContent = "🔁 फेरि प्रयास गर्नुहोस्";
          } else {
            button.textContent = "🔊 फेरि सुन्नुहोस्";
          }
        } finally {
          button.disabled = false;
          if (button.textContent === "⏳ आवाज तयार हुँदैछ…") {
            button.textContent = "🔊 पाठ सुनौँ";
          }
        }
      });

      wrapper.appendChild(button);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addHomeVoiceButtons);
  } else {
    addHomeVoiceButtons();
  }

  window.addEventListener("pagehide", stopVoice);
})();
