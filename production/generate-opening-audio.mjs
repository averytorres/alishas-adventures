import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = path.join(root, 'audio/manifest.json');
if (fs.existsSync(manifestPath)) throw new Error('Audio manifest already exists; opening generation would overwrite recording and route tracking.');
const keyFile = process.argv.find(value => value.startsWith('--key-file='))?.slice('--key-file='.length);
const key = (process.env.ELEVENLABS_API_KEY || (keyFile ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
const voicePlan = JSON.parse(fs.readFileSync(path.join(root, 'production/voice-plan.json'), 'utf8'));
const samplePlan = JSON.parse(fs.readFileSync(path.join(root, 'production/voice-samples.plan.json'), 'utf8'));
const lineIds = [
  'library.instruction',
  'alisha-lost-star.description',
  'castle_gate.situation',
  'castle_gate.choice.0',
  'castle_gate.choice.1',
  'castle_gate.hint',
];
const selectedSample = { en: 'en-clara-warm-TEMP.mp3', es: 'es-daniela-warm-TEMP.mp3', gu: 'gu-mitali-warm-TEMP.mp3' };
const recordings = {};
const textHashes = {};
let totalGeneratedCharacters = 0;
for (const lang of ['en', 'es', 'gu']) {
  const voice = voicePlan.voices[lang];
  if (voice.status !== 'USER_SELECTED_SAMPLE_APPROVED') throw new Error(`${lang} voice is not selected`);
  const story = JSON.parse(fs.readFileSync(path.join(root, `story/locales/${lang}.draft.json`), 'utf8')).lines;
  const ui = JSON.parse(fs.readFileSync(path.join(root, `story/locales/ui.${lang}.draft.json`), 'utf8')).lines;
  recordings[lang] = {};
  textHashes[lang] = {};
  for (const id of lineIds) {
    const text = id.startsWith('library.') ? ui[id] : story[id];
    if (!text) throw new Error(`Missing ${lang}/${id}`);
    const directory = path.join(root, 'audio', lang);
    fs.mkdirSync(directory, { recursive: true });
    const output = path.join(directory, `${id}.mp3`);
    const existedBefore = fs.existsSync(output);
    if (id === 'alisha-lost-star.description' && !fs.existsSync(output)) {
      const sample = samplePlan.samples.find(s => s.language === lang && s.lineId === id);
      const sha = crypto.createHash('sha256').update(text).digest('hex');
      if (sha !== sample.textSha256) throw new Error(`${lang} teaser changed since candidate sample`);
      fs.copyFileSync(path.join(root, 'production/audio-samples', selectedSample[lang]), output);
    }
    if (existedBefore) throw new Error(`Existing recording has no text provenance: ${lang}/${id}`);
    if (!fs.existsSync(output)) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: voice.modelId }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${lang}/${id} returned ${response.status}: ${body.slice(0, 300)}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1000 || !(bytes.toString('latin1', 0, 3) === 'ID3' || bytes[0] === 0xff)) throw new Error(`${lang}/${id} response is not MP3`);
      fs.writeFileSync(output + '.tmp', bytes);
      fs.renameSync(output + '.tmp', output);
      totalGeneratedCharacters += text.length;
      console.log(`${lang}/${id}: ${text.length} characters, ${bytes.length} bytes`);
    }
    recordings[lang][id] = `../audio/${lang}/${id}.mp3`;
    textHashes[lang][id] = crypto.createHash('sha256').update(text).digest('hex');
  }
}
const manifest = {
  schemaVersion: 1,
  status: 'DRAFT_TEMPORARY',
  note: 'Opening-screen recordings only. Remaining story scenes and UI lines are pending.',
  voices: Object.fromEntries(['en', 'es', 'gu'].map(lang => [lang, voicePlan.voices[lang].name])),
  recordings,
  textHashes,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ generatedCharactersThisRun: totalGeneratedCharacters, recordedLines: Object.values(recordings).reduce((n, x) => n + Object.keys(x).length, 0) }));
