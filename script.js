async function playVoice(textToSpeak) {
  try {
    // यसले सिधै ElevenLabs लाई कल नगरी तपाईँकै Vercel Serverless Function लाई कल गर्छ
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToSpeak })
    });

    if (!response.ok) throw new Error('आवाज ल्याउन सकिएन');

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    // मोबाइलमा अडियो प्ले गर्ने
    audio.play(); 
  } catch (error) {
    console.error("त्रुटि:", error);
  }
}

// टेस्ट गर्नको लागि यसरी कल गर्नुहोस्:
// playVoice("नमस्ते, मेरो मोबाइल PWA एपले अब नेपाली बोल्न सक्छ।");
