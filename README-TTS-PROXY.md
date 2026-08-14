# Gemini TTS Proxy – Vercel Edge Function

## Co to dělá
- Prohlížeč volá `/api/tts` místo přímo Gemini API
- API klíč (`GEMINI_API_KEY`) zůstává bezpečně na Vercelu
- Klient nikdy nevidí klíč

## Nastavení na Vercelu

1. Jdi do projektu **stoicky-simulator** → Settings → Environment Variables
2. Přidej:
   - Name: `GEMINI_API_KEY`
   - Value: tvůj Gemini API klíč
   - Environment: Production + Preview
3. Redeploy projekt (nebo pushni nový commit)

## Jak volat z frontendu (index.html)

Místo přímého volání Gemini použij:

```js
async function playGeminiTTSViaProxy(text, voiceName = 'Zephyr') {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'TTS proxy failed');
  }

  const data = await res.json();
  // data.audio = base64, data.mimeType
  // ... stejná logika jako dříve (base64 → WAV → Audio)
  return data;
}
```

## Soubor
- `/api/tts.js` → automaticky se stane Edge Function na Vercelu
