
/*
 * बाल पाठशाला — Dark Mode & Parental Lock
 *
 * Theme preference and parental-lock compatibility only.
 * Gemini voice is controlled by script.js.
 * No browser speech fallback is defined here.
 */

(function () {
  "use strict";

  const THEME_KEY = "theme";
  const DARK_CLASS = "dark-mode";

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark"
        ? "dark"
        : "light";
    } catch (_) {
      return "light";
    }
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";

    function apply() {
      document.documentElement.classList.toggle(
        DARK_CLASS,
        isDark
      );

      if (document.body) {
        document.body.classList.toggle(
          DARK_CLASS,
          isDark
        );
      }

      document.documentElement.style.colorScheme =
        isDark ? "dark" : "light";
    }

    if (document.body) {
      apply();
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        apply,
        { once: true }
      );
    }
  }

  function setTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";

    try {
      localStorage.setItem(THEME_KEY, normalized);
    } catch (_) {
      // Theme still applies for the current page.
    }

    applyTheme(normalized);
  }

  function toggleDarkMode() {
    const isDark =
      document.documentElement.classList.contains(DARK_CLASS) ||
      (
        document.body &&
        document.body.classList.contains(DARK_CLASS)
      );

    setTheme(isDark ? "light" : "dark");
  }

  function stopVoice() {
    // Delegate audio control to the Gemini voice controller.
    if (typeof window.stopVoice === "function") {
      window.stopVoice();
    }

    // Cancel any browser speech left over from older scripts.
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {
        // Ignore unsupported browser behavior.
      }
    }
  }

  function openParentalLock(callback) {
    const first = Math.floor(Math.random() * 9) + 1;
    const second = Math.floor(Math.random() * 9) + 1;
    const expectedAnswer = first + second;

    const response = window.prompt(
      "अभिभावक जाँच\n\n" +
      first + " + " + second + " = कति हुन्छ?"
    );

    if (response === null || response.trim() === "") {
      return false;
    }

    if (
      !/^\d+$/.test(response.trim()) ||
      Number(response.trim()) !== expectedAnswer
    ) {
      window.alert(
        "उत्तर मिलेन। कृपया फेरि प्रयास गर्नुहोस्।"
      );
      return false;
    }

    if (typeof callback === "function") {
      callback();
    }

    return true;
  }

  // Keep existing theme controls working.
  if (typeof window.toggleDarkMode !== "function") {
    window.toggleDarkMode = toggleDarkMode;
  }

  if (typeof window.setTheme !== "function") {
    window.setTheme = setTheme;
  }

  if (typeof window.openParentalLock !== "function") {
    window.openParentalLock = openParentalLock;
  }

  if (typeof window.stopVoice !== "function") {
    window.stopVoice = stopVoice;
  }

  // Intentionally do NOT define window.playAIVoice here.
  // script.js is the single source of Gemini voice playback.

  applyTheme(getSavedTheme());
})();
