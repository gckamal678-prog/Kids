
/*
 * बाल पाठशाला — Gemini AI Voice Controller
 * - Browser/mobile TTS fallback छैन
 * - अनुमति दिइएका पृष्ठमा मात्र AI आवाज
 * - अनुरोध timeout, cancel र duplicate-request नियन्त्रण
 * - स्पष्ट error reporting र in-memory audio cache
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

  const REQUEST_TIMEOUT_MS = 20000;
  const MAX_TEXT_LENGTH = 500;
  const MAX_CACHE_ITEMS = 40;
  const MAX_CACHE_BYTES = 15 * 1024 * 1024;

  let requestId = 0;
  let activeController = null;
  let currentAudio = null;
  let currentObjectUrl = null;
  let cacheBytes = 0;

  const audioCache = new Map();

  function currentPath() {
    return window.location.pathname.replace(/\/+$/, "") || "/";
  }

  function isVoiceAllowedHere() {
    const path = currentPath();

    if (
      path === "/" ||
      path.endsWith("/index.html") ||
      path.endsWith("/Kids")
    ) {
      return true;
    }

    return ALLOWED_SUFFIXES.some(path.endsWith.bind(path));
  }

  function stopBrowserSpeech() {
    // Browser TTS बजाउने छैनौँ। पहिलेबाट चलिरहेको भए रोक्ने मात्र।
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  function releaseAudio() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.removeAttribute("src");
        currentAudio.load();
      } catch (_) {}

      currentAudio = null;
    }

    if (currentObjectUrl) {
      try {
        URL.revokeObjectURL(currentObjectUrl);
      } catch (_) {}

      currentObjectUrl = null;
    }
  }

  function stopVoice() {
    requestId++;

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseAudio();
    stopBrowserSpeech();
  }

  function reportVoiceError(code, message, details = {}) {
    const errorInfo = {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    window.lastBalPathshalaVoiceError = errorInfo;

    console.error("[बाल पाठशाला AI आवाज]", errorInfo);

    window.dispatchEvent(
      new CustomEvent("balpathshala:voice-error", {
        detail: errorInfo
      })
    );

    return errorInfo;
  }

  function cacheGet(text) {
    const entry = audioCache.get(text);

    if (!entry) return null;

    // प्रयोग भएको वस्तुलाई cache को अन्तिम स्थानमा सार्ने।
    audioCache.delete(text);
    audioCache.set(text, entry);

    return entry.blob;
  }

  function cacheSet(text, blob) {
    const old = audioCache.get(text);

    if (old) {
      cacheBytes -= old.size;
      audioCache.delete(text);
    }

    // धेरै ठूलो अडियो memory मा नराख्ने।
    if (blob.size > MAX_CACHE_BYTES) return;

    while (
      audioCache.size >= MAX_CACHE_ITEMS ||
      cacheBytes + blob.size > MAX_CACHE_BYTES
    ) {
      const oldestKey = audioCache.keys().next().value;

      if (oldestKey === undefined) break;

      const oldest = audioCache.get(oldestKey);
      cacheBytes -= oldest.size;
      audioCache.delete(oldestKey);
    }

    audioCache.set(text, {
      blob,
      size: blob.size
    });

    cacheBytes += blob.size;
  }

  async function readServerError(response) {
    let body = "";

    try {
      body = (await response.text()).slice(0, 700);
    } catch (_) {}

    if (body) {
      try {
        const json = JSON.parse(body);
        return String(
          json.message ||
          json.error ||
          json.detail ||
          body
        ).slice(0, 400);
      } catch (_) {
        return body;
      }
    }

    return response.statusText || "सर्भरले अनुरोध स्वीकार गरेन।";
  }

  function classifyError(error) {
    if (error && error.name === "AbortError") {
      return {
        code: "REQUEST_CANCELLED",
        message: "आवाज अनुरोध रोकियो।"
      };
    }

    if (error && error.name === "VoiceTimeoutError") {
      return {
        code: "VOICE_TIMEOUT",
        message:
          "AI आवाज तयार हुन धेरै समय लाग्यो। केहीबेरपछि फेरि प्रयास गर्नुहोस्।"
      };
    }

    if (error && error.name === "NotAllowedError") {
      return {
        code: "AUDIO_PLAYBACK_BLOCKED",
        message:
          "ब्राउजरले अडियो बजाउन दिएन। आवाज बटन फेरि थिच्नुहोस्।"
      };
    }

    if (error && error.name === "TypeError") {
      return {
        code: "NETWORK_OR_CORS_ERROR",
        message:
          "AI सेवासँग सम्पर्क हुन सकेन। यो नेटवर्क, CORS वा Worker उपलब्धताको समस्या हुन सक्छ; इन्टरनेट बन्द छ भन्ने निश्चित होइन।"
      };
    }

    return {
      code: "VOICE_ERROR",
      message:
        error && error.message
          ? error.message
          : "AI आवाज चलाउन सकिएन। फेरि प्रयास गर्नुहोस्।"
    };
  }

  async function playVoice(textToSpeak, callback) {
    stopBrowserSpeech();

    if (!isVoiceAllowedHere()) {
      reportVoiceError(
        "PAGE_NOT_ALLOWED",
        "यो पृष्ठमा AI आवाज अनुमति दिइएको छैन।"
      );
      return false;
    }

    const text = String(textToSpeak ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEXT_LENGTH);

    if (!text) return false;

    // नयाँ अनुरोधले पुरानो अनुरोध र अडियो रोक्छ।
    const id = ++requestId;

    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    releaseAudio();

    let blob = cacheGet(text);

    try {
      if (!blob) {
        const controller = new AbortController();
        activeController = controller;

        const timeout = setTimeout(() => {
          controller.abort();

          const timeoutError = new Error(
            "AI voice request timed out."
          );
          timeoutError.name = "VoiceTimeoutError";

          if (id === requestId) {
            window.lastBalPathshalaVoiceTimeout = timeoutError;
          }
        }, REQUEST_TIMEOUT_MS);

        let response;

        try {
          response = await fetch(VOICE_WORKER, {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              "Accept": "audio/*, application/octet-stream, application/json"
            },
            body: JSON.stringify({ text }),
            signal: controller.signal
          });
        } catch (error) {
          clearTimeout(timeout);

          if (id !== requestId) return false;

          if (
            controller.signal.aborted &&
            window.lastBalPathshalaVoiceTimeout
          ) {
            const info = reportVoiceError(
              "VOICE_TIMEOUT",
              "AI आवाज तयार हुन २० सेकेन्डभन्दा बढी लाग्यो।",
              { timeoutMs: REQUEST_TIMEOUT_MS }
            );

            throw Object.assign(new Error(info.message), {
              name: "VoiceTimeoutError"
            });
          }

          throw error;
        }

        clearTimeout(timeout);

        if (id !== requestId) return false;

        if (!response.ok) {
          const serverMessage = await readServerError(response);

          reportVoiceError(
            "WORKER_HTTP_ERROR",
            `AI Worker ले HTTP ${response.status} त्रुटि दियो।`,
            {
              status: response.status,
              serverMessage
            }
          );

          throw new Error(
            `Worker HTTP ${response.status}: ${serverMessage}`
          );
        }

        const contentType = (
          response.headers.get("content-type") || ""
        ).toLowerCase();

        if (
          contentType.includes("application/json") ||
          contentType.includes("text/html")
        ) {
          const serverMessage = await readServerError(response);

          reportVoiceError(
            "WORKER_RETURNED_NON_AUDIO",
            "Worker बाट अडियोको सट्टा त्रुटि वा टेक्स्ट आयो।",
            { contentType, serverMessage }
          );

          throw new Error(serverMessage);
        }

        blob = await response.blob();

        if (id !== requestId) return false;

        if (!blob || blob.size === 0) {
          throw new Error("Worker बाट खाली अडियो प्राप्त भयो।");
        }

        if (
          blob.type &&
          !blob.type.startsWith("audio/") &&
          blob.type !== "application/octet-stream"
        ) {
          throw new Error(
            `प्राप्त अडियोको प्रकार मिलेन: ${blob.type}`
          );
        }

        cacheSet(text, blob);
      }

      if (id !== requestId) return false;

      activeController = null;

      currentObjectUrl = URL.createObjectURL(blob);

      const audio = new Audio();
      currentAudio = audio;
      audio.preload = "auto";
      audio.src = currentObjectUrl;

      await new Promise((resolve, reject) => {
        let settled = false;

        const finish = (error) => {
          if (settled) return;
          settled = true;

          audio.onended = null;
          audio.onerror = null;

          if (id !== requestId) {
            resolve(false);
            return;
          }

          if (error) reject(error);
          else resolve(true);
        };

        audio.onended = () => finish();
        audio.onerror = () => {
          const error = new Error(
            "प्राप्त अडियो बजाउन सकिएन।"
          );
          error.name = "AudioPlaybackError";
          finish(error);
        };

        audio.play().catch(finish);
      }).then((played) => {
        if (played && id === requestId) {
          releaseAudio();

          if (typeof callback === "function") {
            try {
              callback();
            } catch (error) {
              console.warn("Voice callback error:", error);
            }
          }
        }
      });

      return true;

    } catch (error) {
      if (id !== requestId) return false;

      activeController = null;

      if (error && error.name !== "AbortError") {
        const classified = classifyError(error);

        reportVoiceError(
          classified.code,
          classified.message,
          {
            originalError: String(error.message || error)
          }
        );
      }

      releaseAudio();
      return false;
    }
  }

  window.playVoice = playVoice;
  window.playAIVoice = playVoice;
  window.stopVoice = stopVoice;
  window.isGeminiVoiceAllowed = isVoiceAllowedHere;

  window.clearBalPathshalaVoiceCache = () => {
    audioCache.clear();
    cacheBytes = 0;
  };

  window.addEventListener("pagehide", stopVoice);
})();
