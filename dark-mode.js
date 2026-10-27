
/*
 * बाल पाठशाला — Dark Mode & Voice Utilities
 * Stage 2 replacement
 *
 * - Light/Dark theme support
 * - Saved theme preference
 * - Nepali/English browser voice
 * - Legacy parental-lock compatibility
 * - Avoids overwriting functions already defined by other scripts
 */

(function () {
  "use strict";

  const THEME_KEY = "theme";
  const DARK_CLASS = "dark-mode";

  /* ------------------------------
     1. Theme management
  ------------------------------ */

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark"
        ? "dark"
        : "light";
    } catch (error) {
      return "light";
    }
  }

  function applySavedTheme() {
    const isDark = getSavedTheme() === "dark";

    function apply() {
      if (!document.body) return;

      document.body.classList.toggle(DARK_CLASS, isDark);
      document.documentElement.classList.toggle(DARK_CLASS, isDark);
      document.documentElement.style.colorScheme =
        isDark ? "dark" : "light";
    }

    if (document.body) {
      apply();
    } else {
      document.addEventListener("DOMContentLoaded", apply, {
        once: true
      });
    }
  }

  function setTheme(theme) {
    const normalizedTheme = theme === "dark" ? "dark" : "light";

    try {
      localStorage.setItem(THEME_KEY, normalizedTheme);
    } catch (error) {
      // Theme still works for the current page if storage is unavailable.
    }

    const apply = function () {
      if (!document.body) return;

      const isDark = normalizedTheme === "dark";

      document.body.classList.toggle(DARK_CLASS, isDark);
      document.documentElement.classList.toggle(DARK_CLASS, isDark);
      document.documentElement.style.colorScheme =
        isDark ? "dark" : "light";
    };

    if (document.body) {
      apply();
    } else {
      document.addEventListener("DOMContentLoaded", apply, {
        once: true
      });
    }
  }

  function toggleDarkMode() {
    const currentlyDark =
      document.body &&
      document.body.classList.contains(DARK_CLASS);

    setTheme(currentlyDark ? "light" : "dark");
  }

  /* ------------------------------
     2. Voice management
  ------------------------------ */

  function playAIVoice(text) {
    if (!("speechSynthesis" in window)) {
      console.warn(
        "यो ब्राउजरमा Voice सुविधा उपलब्ध छैन।"
      );
      return false;
    }

    const message = String(text == null ? "" : text).trim();

    if (!message) return false;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    // नेपाली अक्षर भए नेपाली voice प्राथमिकता दिने।
    const containsNepali = /[\u0900-\u097F]/.test(message);

    utterance.lang = containsNepali ? "ne-NP" : "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const preferredVoice = voices.find(function (voice) {
      return containsNepali
        ? /^ne([-_]|$)/i.test(voice.lang)
        : /^en([-_]|$)/i.test(voice.lang);
    });

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }

  function stopVoice() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /* ------------------------------
     3. Legacy parental-lock support
  ------------------------------ */

  function openParentalLock(callback) {
    const first = Math.floor(Math.random() * 9) + 1;
    const second = Math.floor(Math.random() * 9) + 1;
    const expectedAnswer = first + second;

    const response = window.prompt(
      "अभिभावक जाँच\n\n" +
      first + " + " + second + " = कति हुन्छ?"
    );

    // Cancel गर्दा वा खाली उत्तर दिँदा अगाडि नबढ्ने।
    if (response === null || response.trim() === "") {
      return false;
    }

    if (
      !/^\d+$/.test(response.trim()) ||
      Number(response.trim()) !== expectedAnswer
    ) {
      window.alert("उत्तर मिलेन। कृपया फेरि प्रयास गर्नुहोस्।");
      return false;
    }

    if (typeof callback === "function") {
      callback();
    }

    return true;
  }

  /* ------------------------------
     4. Safe global compatibility
  ------------------------------ */

  // पहिले नै परिभाषित function लाई overwrite नगर्ने।
  if (typeof window.toggleDarkMode !== "function") {
    window.toggleDarkMode = toggleDarkMode;
  }

  if (typeof window.setTheme !== "function") {
    window.setTheme = setTheme;
  }

  if (typeof window.playAIVoice !== "function") {
    window.playAIVoice = playAIVoice;
  }

  if (typeof window.stopVoice !== "function") {
    window.stopVoice = stopVoice;
  }

  if (typeof window.openParentalLock !== "function") {
    window.openParentalLock = openParentalLock;
  }

  /* ------------------------------
     5. Initialize saved theme
  ------------------------------ */

  applySavedTheme();

})();
