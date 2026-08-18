// api/tts.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // तपाईँको मनपर्ने Voice ID
  
  // Vercel ले यहाँ तपाईँको लुकेको API Key तान्छ
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

    if (!response.ok) {
      throw new Error('ElevenLabs API मा समस्या आयो');
    }

    // अडियो डेटालाई सिधै फ्रन्टएन्डमा पठाइदिने
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
