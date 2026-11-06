import fs from 'node:fs';
const keyFile = process.argv[2];
const key = (process.env.ELEVENLABS_API_KEY || (keyFile ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
if (!key) throw new Error('Set ELEVENLABS_API_KEY or pass a local key-file path. Never put the key in the project.');
async function get(path) {
  const response = await fetch(`https://api.elevenlabs.io${path}`, { headers: { 'xi-api-key': key } });
  if (!response.ok) throw new Error(`ElevenLabs GET ${path} returned ${response.status}`);
  return response.json();
}
const subscription = await get('/v1/user/subscription');
const remaining = subscription.character_limit - subscription.character_count;
console.log(JSON.stringify({ used: subscription.character_count, limit: subscription.character_limit, remaining }));
for (const language of ['en', 'es', 'gu']) {
  const query = new URLSearchParams({ gender: 'female', language, page_size: '30' });
  const data = await get(`/v2/voices?${query}`);
  console.log(JSON.stringify({ language, voices: data.voices.slice(0, 12).map(voice => ({ id: voice.voice_id, name: voice.name, category: voice.category, labels: voice.labels })) }));
}
