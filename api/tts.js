// api/tts.js
export default async function handler(req, res) {
  // CORS र Method चेक गर्ने
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  const VOICE_ID = 'dVTC43Yewy5fAIcmsISI'; // तपाईँको मनपर्ने Voice ID
  const apiKey = process.env.ELEVEN_API_KEY; // Vercel को ड्यासबोर्डमा राखेको Key

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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs Error: ${errorText}`);
    }

    // अडियोलाई ArrayBuffer मा लिने र Base64 मा बदल्ने (यसले डाटा सुरक्षित राख्छ)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    // फ्रन्टएन्डमा Base64 डाटा पठाउने
    return res.status(200).json({ audioData: base64Audio });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
