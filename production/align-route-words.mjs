import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const story = JSON.parse(fs.readFileSync(path.join(root, 'story/alisha-lost-star.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'audio/manifest.json'), 'utf8'));
const outputPath = path.join(root, 'audio/word-timings.draft.json');
const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const route = manifest.route?.scenes ?? [
  'castle_gate', 'bridge_song', 'frog_clue', 'bridge_crossroads', 'hill_approach',
  'hill_path', 'windmill_keeper', 'woods_threshold', 'cloud_edge', 'cloud_path',
  'cloud_pillows', 'cloud_chime', 'ending_cloud_guide'
];
const pending = [];
for (const language of ['en', 'es', 'gu']) {
  const lines = JSON.parse(fs.readFileSync(path.join(root, `story/locales/${language}.draft.json`), 'utf8')).lines;
  for (const scene of route) {
    if (!story.scenes[scene]) throw new Error(`Unknown scene: ${scene}`);
    const id = `${scene}.situation`, text = lines[id];
    if (!text || !manifest.recordings[language]?.[id]) throw new Error(`Missing recording or text: ${language}/${id}`);
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    if (manifest.textHashes[language]?.[id] !== hash) throw new Error(`Recording no longer matches text: ${language}/${id}`);
    const existing = output.timings[language]?.[id];
    if (existing?.text === text && existing.words?.length === (text.match(/\S+/gu) ?? []).length &&
      existing.words.every(([start, end], index) => Number.isFinite(start) && Number.isFinite(end) &&
        start >= 0 && end > start && (index === 0 || start >= existing.words[index - 1][0]))) continue;
    pending.push({ language, id, text, file: path.join(root, 'audio', language, `${id}.mp3`) });
  }
}
console.log(`Situation recordings awaiting word alignment: ${pending.length}`);
if (!process.argv.includes('--generate')) process.exit(0);
if (pending.length > 39) throw new Error('Unexpected alignment batch size');
const keyFile = process.argv.find(value => value.startsWith('--key-file='))?.slice('--key-file='.length);
const key = (process.env.ELEVENLABS_API_KEY || (keyFile ? fs.readFileSync(keyFile, 'utf8') : '')).trim();
if (!key) throw new Error('Alignment API key missing');

function timingsFromResponse(result, text) {
  const displayWords = text.match(/\S+/gu) ?? [];
  if (result.characters?.map(item => item.text).join('') === text) {
    const groups = [];
    let group = [];
    for (const item of result.characters) {
      if (/^\s+$/u.test(item.text)) {
        if (group.length) { groups.push(group); group = []; }
      } else group.push(item);
    }
    if (group.length) groups.push(group);
    if (groups.length === displayWords.length) return groups.map(items => [items[0].start, items.at(-1).end]);
  }
  if (result.words?.length === displayWords.length) return result.words.map(item => [item.start, item.end]);
  throw new Error(`Word count mismatch: display=${displayWords.length}, aligned=${result.words?.length}`);
}

for (const item of pending) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(item.file)], { type: 'audio/mpeg' }), `${item.id}.mp3`);
  form.append('text', item.text);
  const response = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {
    method: 'POST', headers: { 'xi-api-key': key }, body: form
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${item.language}/${item.id}: alignment status ${response.status}: ${result.detail?.message ?? JSON.stringify(result.detail ?? result.message)}`);
  const words = timingsFromResponse(result, item.text).map(([start, end]) => [Math.round(start * 1000) / 1000, Math.round(end * 1000) / 1000]);
  if (!words.every(([start, end], index) => Number.isFinite(start) && Number.isFinite(end) && start >= 0 &&
    end > start && (index === 0 || start >= words[index - 1][0]))) {
    throw new Error(`${item.language}/${item.id}: invalid or zero-duration timings; inspect the recording before saving`);
  }
  output.timings[item.language] ??= {};
  output.timings[item.language][item.id] = { text: item.text, words };
  fs.writeFileSync(`${outputPath}.tmp`, JSON.stringify(output, null, 2) + '\n');
  fs.renameSync(`${outputPath}.tmp`, outputPath);
  console.log(`${item.language}/${item.id}: ${words.length} words`);
}
output.status = 'DRAFT_ALIGNED_PENDING_REVIEW';
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
