// Vercel Edge Function – bezpečná proxy pro Gemini TTS
// Soubor: /api/tts.js

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Pouze POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { text, voiceName = 'Zephyr' } = body;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "text"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // API klíč z Vercel Environment Variables (nikdy se neukáže v prohlížeči)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const promptText = `Say cheerfully and clearly in fluent Czech: ${text}`;

    const payload = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errText);
      return new Response(JSON.stringify({ 
        error: 'Gemini TTS failed', 
        status: geminiRes.status,
        details: errText.slice(0, 300)
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await geminiRes.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';

    if (!base64Audio) {
      return new Response(JSON.stringify({ error: 'No audio data returned from Gemini' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Vrátíme audio data klientovi
    return new Response(JSON.stringify({
      audio: base64Audio,
      mimeType,
      voice: voiceName
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // cache 1 hodinu (stejný text + hlas)
      },
    });

  } catch (err) {
    console.error('Edge Function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
