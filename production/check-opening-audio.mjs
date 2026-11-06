import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'audio/manifest.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(root, 'production/voice-plan.json'), 'utf8'));
const required = ['library.instruction', 'alisha-lost-star.description', 'castle_gate.situation', 'castle_gate.choice.0', 'castle_gate.choice.1', 'castle_gate.hint'];
let checked = 0;
for (const lang of ['en', 'es', 'gu']) {
  if (manifest.voices[lang] !== plan.voices[lang].name) throw new Error(`${lang}: voice mismatch`);
  const story = JSON.parse(fs.readFileSync(path.join(root, `story/locales/${lang}.draft.json`), 'utf8')).lines;
  const ui = JSON.parse(fs.readFileSync(path.join(root, `story/locales/ui.${lang}.draft.json`), 'utf8')).lines;
  for (const id of required) {
    const text = id.startsWith('library.') ? ui[id] : story[id];
    if (typeof text !== 'string' || !text.trim()) throw new Error(`${lang}/${id}: no source text`);
    if (manifest.textHashes?.[lang]?.[id] !== crypto.createHash('sha256').update(text).digest('hex')) throw new Error(`${lang}/${id}: recording text is stale`);
    const url = manifest.recordings[lang][id];
    if (url !== `../audio/${lang}/${id}.mp3`) throw new Error(`${lang}/${id}: bad URL`);
    const file = path.join(root, 'audio', lang, `${id}.mp3`);
    const bytes = fs.readFileSync(file);
    if (bytes.length < 1000 || !(bytes.toString('latin1', 0, 3) === 'ID3' || bytes[0] === 0xff)) throw new Error(`${lang}/${id}: invalid MP3`);
    checked++;
  }
}
console.log(`Verified ${checked} opening recordings and their localized source lines.`);
