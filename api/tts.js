// api/tts.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  
  // 💡 १. यो ElevenLabs को सबैभन्दा Standard नि:शुल्क Voice ID (Rachel) हो। यसलाई राखेर टेस्ट गरौँ।
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 
  const apiKey = process.env.ELEVEN_API_KEY; 

  try {
    const response = await fetch(`https://elevenlabs.io{VOICE_ID}`, {
      method: 'POST',
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        "text": text,
        "model_id": "eleven_multilingual_v2"
      })
    });

    // 💡 २. यदि ११ल्याब्समा कोटा सकिएको छ वा की ब्लक भएको छ भने यसले सही एरर मेसेज फ्रन्टएन्डमा पठाउँछ
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "ElevenLabs API Error";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail?.message || errorMessage;
      } catch (e) {
        errorMessage = errorText;
      }
      return res.status(response.status).json({ error: errorMessage });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    return res.status(200).json({ audioData: base64Audio });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
