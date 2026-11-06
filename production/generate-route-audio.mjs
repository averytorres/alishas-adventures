import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const ending = process.argv.find(value => value.startsWith('--ending='))?.split('=')[1] ?? 'ending_cloud_guide';
const generate = process.argv.includes('--generate');
const story = JSON.parse(fs.readFileSync(path.join(root, 'story/alisha-lost-star.json'), 'utf8'));
const voicePlan = JSON.parse(fs.readFileSync(path.join(root, 'production/voice-plan.json'), 'utf8'));
const manifestPath = path.join(root, 'audio/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.textHashes ??= {};

function routeTo(target) {
  const queue = [[story.start]];
  while (queue.length) {
    const route = queue.shift();
    const current = route.at(-1);
    if (current === target) return route;
    for (const choice of story.scenes[current].choices ?? []) {
      if (story.scenes[choice.next] && !route.includes(choice.next)) queue.push([...route, choice.next]);
    }
  }
  throw new Error(`Unreachable ending: ${target}`);
}

if (!story.scenes[ending]?.ending) throw new Error(`Not an ending: ${ending}`);
const route = routeTo(ending);
const lineIds = route.flatMap(id => [
  `${id}.situation`,
  ...story.scenes[id].choices.map((_, index) => `${id}.choice.${index}`),
  `${id}.hint`,
]);
const work = [];
for (const lang of ['en', 'es', 'gu']) {
  const voice = voicePlan.voices[lang];
  if (voice.status !== 'USER_SELECTED_SAMPLE_APPROVED') throw new Error(`Voice not selected: ${lang}`);
  const lines = JSON.parse(fs.readFileSync(path.join(root, `story/locales/${lang}.draft.json`), 'utf8')).lines;
  manifest.recordings[lang] ??= {};
  manifest.textHashes[lang] ??= {};
  for (const id of lineIds) {
    const text = lines[id];
    if (typeof text !== 'string' || !text.trim()) throw new Error(`Missing text: ${lang}/${id}`);
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const file = path.join(root, 'audio', lang, `${id}.mp3`);
    const exists = fs.existsSync(file);
    if (exists && manifest.textHashes[lang][id] !== hash) {
      throw new Error(`Recording text hash missing or changed: ${lang}/${id}`);
    }
    if (exists && fs.statSync(file).size < 1000) throw new Error(`Invalid recording: ${file}`);
    work.push({ lang, id, text, hash, file, voice, exists });
  }
}
const pending = work.filter(item => !item.exists);
const estimate = {
  ending, scenes: route.length, route, linesPerLanguage: lineIds.length,
  missingRecordings: pending.length,
  newCharacters: pending.reduce((total, item) => total + item.text.length, 0),
  perLanguage: Object.fromEntries(['en', 'es', 'gu'].map(lang => [lang, {
    missing: pending.filter(item => item.lang === lang).length,
    characters: pending.filter(item => item.lang === lang).reduce((total, item) => total + item.text.length, 0),
  }])),
};
console.log(JSON.stringify(estimate, null, 2));
if (!generate) process.exit(0);
if (estimate.newCharacters > 30000 || pending.length > 160) throw new Error('Route exceeds the planned batch size');
const keyFile = process.argv.find(value => value.startsWith('--key-file='))?.slice('--key-file='.length);
const key = (process.env.ELEVENLABS_API_KEY || (keyFile ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
if (!key) throw new Error('ElevenLabs key missing');

function saveManifest() {
  const temporary = `${manifestPath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync(temporary, manifestPath);
}

for (const item of work) {
  if (!item.exists) {
    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${item.voice.voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text, model_id: item.voice.modelId }),
      });
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) break;
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${item.lang}/${item.id} returned ${response.status}: ${body.slice(0, 250)}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1000 || !(bytes.toString('latin1', 0, 3) === 'ID3' || bytes[0] === 0xff)) {
      throw new Error(`Not MP3 audio: ${item.lang}/${item.id}`);
    }
    fs.mkdirSync(path.dirname(item.file), { recursive: true });
    fs.writeFileSync(`${item.file}.tmp`, bytes);
    fs.renameSync(`${item.file}.tmp`, item.file);
    console.log(`Recorded ${item.lang}/${item.id} (${item.text.length} characters)`);
  }
  manifest.recordings[item.lang][item.id] = `../audio/${item.lang}/${item.id}.mp3`;
  manifest.textHashes[item.lang][item.id] = item.hash;
  saveManifest();
}
manifest.routes ??= [];
if (!manifest.routes.includes(ending)) manifest.routes.push(ending);
saveManifest();
console.log(`Completed ${ending}: ${work.length} available recordings`);
