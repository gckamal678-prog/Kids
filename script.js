const ELEVENLABS_API_KEY = "Sk_d440689f8bf76f29dad2f62721ae97ee08ccdecdb59c5b0c";
const VOICE_ID = "dVTC43Yewy5fAIcmsISI";

let currentAudio = null;

async function playAIVoice(textToSpeak) {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: textToSpeak,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.6, similarity_boost: 0.75 }
      })
    });

    if (response.ok) {
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudio = new Audio(audioUrl);
      currentAudio.play();
      return; // सफल भए here stop
    }
  } catch (error) {
    console.log("ElevenLabs API काम गरेन, ब्राउजरको आवाज प्रयोग गरिदैछ...");
  }

  // ब्याकअप: यदि ElevenLabs चलेन भने मोबाइल/ब्राउजरकै आवाज बोल्नेछ
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // अगाडिको रोक्ने
    let utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ne-NP';
    window.speechSynthesis.speak(utterance);
  }
}
