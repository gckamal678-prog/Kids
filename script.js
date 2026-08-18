// सहि तरिकाले ElevenLabs को क्लाइन्ट सेट अप गर्ने
const ELEVENLABS_API_KEY = "Sk_d440689f8bf76f29dad2f62721ae97ee08ccdecdb59c5b0c";
const VOICE_ID = "dVTC43Yewy5fAIcmsISI";

async function playText(text) {
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.6,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            console.error("आवाज लोड हुन सकेन। एरर कोड:", response.status);
            return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const player = new Audio(audioUrl);
        player.play();
        
    } catch (error) {
        console.error("आवाज बजाउन समस्या भयो:", error);
    }
}
