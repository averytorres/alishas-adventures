import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const story = read('story/alisha-lost-star.json');
const sceneArt = read('story/scene-art.draft.json').scenes;
const audio = read('audio/manifest.json');
const ending = process.argv.find(value => value.startsWith('--ending='))?.split('=')[1] ?? 'ending_cloud_guide';
if (!story.scenes[ending]?.ending) throw new Error(`Not an ending: ${ending}`);
const queue = [[story.start]];
let route;
while (queue.length) {
  const current = queue.shift();
  const id = current.at(-1);
  if (id === ending) { route = current; break; }
  for (const choice of story.scenes[id].choices ?? []) {
    if (story.scenes[choice.next] && !current.includes(choice.next)) queue.push([...current, choice.next]);
  }
}
if (!route) throw new Error(`Unreachable ending ${ending}`);
let checked = 0;
for (const id of route) {
  const art = sceneArt[id];
  if (!art) throw new Error(`Missing art mapping for ${id}`);
  for (const key of ['background', 'dragon']) {
    const file = path.resolve(root, 'v2', art[key]);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) throw new Error(`Missing ${key} for ${id}: ${file}`);
  }
  const ids = [`${id}.situation`, ...story.scenes[id].choices.map((_, index) => `${id}.choice.${index}`), `${id}.hint`];
  for (const lang of ['en', 'es', 'gu']) {
    const lines = read(`story/locales/${lang}.draft.json`).lines;
    for (const lineId of ids) {
      const text = lines[lineId];
      const expectedHash = crypto.createHash('sha256').update(text).digest('hex');
      if (audio.textHashes?.[lang]?.[lineId] !== expectedHash) throw new Error(`Stale text for ${lang}/${lineId}`);
      const url = audio.recordings?.[lang]?.[lineId];
      if (url !== `../audio/${lang}/${lineId}.mp3`) throw new Error(`Missing audio mapping for ${lang}/${lineId}`);
      const file = path.resolve(root, 'v2', url);
      const bytes = fs.readFileSync(file);
      if (bytes.length < 1000 || !(bytes.toString('latin1', 0, 3) === 'ID3' || bytes[0] === 0xff)) {
        throw new Error(`Invalid audio for ${lang}/${lineId}`);
      }
      checked++;
    }
  }
}
console.log(`Checked ${route.length} illustrated scenes and ${checked} matched recordings through ${ending}.`);
