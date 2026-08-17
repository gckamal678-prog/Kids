// तपाईंको सुरक्षित गरिएको API Key र Voice ID
const ELEVENLABS_API_KEY = "Sk_d440689f8bf76f29dad2f62721ae97ee08ccdecdb59c5b0c";
const VOICE_ID = "dVTC43Yewy5fAIcmsISI";

// मायालु स्वरमा पाठ (Text) लाई आवाजमा बदल्ने फंक्सन
async function playAIVoice(textToSpeak) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: textToSpeak,
        model_id: "eleven_multilingual_v2", // नेपाली र अंग्रेजी दुवै स्पष्ट बोल्नका लागि
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      console.error("आवाज लोड हुन सकेन।");
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } catch (error) {
    console.error("त्रुटि देखियो:", error);
  }
}
