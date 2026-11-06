import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateStory } from '../engine/story.mjs';
import { localizeStory } from '../engine/localize-story.mjs';
import { timedWordsFor } from '../v2/word-highlighting.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const exists = relative => fs.existsSync(path.resolve(root, relative));
const story = read('story/alisha-lost-star.json');
const audio = read('audio/manifest.json');
const timings = read('audio/word-timings.draft.json').timings;
const art = read('story/scene-art.draft.json').scenes;
const motion = read('story/body-motion.draft.json').scenes;
const problems = [];
const stats = {};

for (const language of ['en', 'es', 'gu']) {
  const localized = localizeStory(story, read(`story/locales/${language}.draft.json`));
  problems.push(...validateStory(localized).map(problem => `${language}: ${problem}`));
  const lines = read(`story/locales/${language}.draft.json`).lines;
  const ui = read(`story/locales/ui.${language}.draft.json`).lines;
  const needed = new Map();
  needed.set(`${story.id}.description`, lines[`${story.id}.description`]);
  for (const [id, scene] of Object.entries(localized.scenes)) {
    needed.set(`${id}.situation`, scene.situation);
    needed.set(`${id}.hint`, scene.hint);
    scene.choices.forEach((choice, index) => needed.set(`${id}.choice.${index}`, choice.text));
  }
  // These labels can be requested by the child; parent-only settings are excluded.
  for (const [id, text] of Object.entries(ui)) needed.set(id, text);
  let recorded = 0, aligned = 0, missingCharacters = 0;
  for (const [id, text] of needed) {
    if (typeof text !== 'string' || !text.trim()) {
      problems.push(`${language}/${id}: missing localized text`);
      continue;
    }
    const relativeUrl = audio.recordings?.[language]?.[id];
    if (!relativeUrl) {
      missingCharacters += text.length;
      problems.push(`${language}/${id}: missing recording`);
      continue;
    }
    const expectedHash = crypto.createHash('sha256').update(text).digest('hex');
    if (audio.textHashes?.[language]?.[id] !== expectedHash) problems.push(`${language}/${id}: recording text is stale`);
    const absolute = path.resolve(root, 'v2', relativeUrl);
    if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute) || fs.statSync(absolute).size < 1000) {
      problems.push(`${language}/${id}: recording file missing or too small`);
      continue;
    }
    recorded++;
    if (id.endsWith('.situation')) {
      if (timedWordsFor({ text }, timings?.[language]?.[id])) aligned++;
      else problems.push(`${language}/${id}: missing or stale word timing`);
    }
  }
  stats[language] = { required: needed.size, recorded, alignedSituations: aligned, missingCharacters };
}

const backgroundOwners = new Map();
const backgroundHashes = new Map();
for (const [id, scene] of Object.entries(story.scenes)) {
  const image = art[id];
  if (!image) problems.push(`${id}: missing scene art mapping`);
  else for (const key of ['background', 'dragon']) {
    if (!image[key] || !exists(path.join('v2', image[key]))) problems.push(`${id}: missing ${key} image`);
  }
  if (image?.background) {
    const previous = backgroundOwners.get(image.background);
    if (previous) problems.push(`${id}: background reused from ${previous}`);
    else backgroundOwners.set(image.background, id);
    const backgroundFile = path.resolve(root, 'v2', image.background);
    if (fs.existsSync(backgroundFile)) {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(backgroundFile)).digest('hex');
      const sameArt = backgroundHashes.get(hash);
      if (sameArt) problems.push(`${id}: background image duplicates ${sameArt}`);
      else backgroundHashes.set(hash, id);
    }
  }
  if (!motion[id]) problems.push(`${id}: using default body motion`);
  if (!scene.ending && !scene.hint) problems.push(`${id}: missing contextual hint`);
}

console.log(JSON.stringify({ scenes: Object.keys(story.scenes).length, artMappings: Object.keys(art).length, motionMappings: Object.keys(motion).length, languages: stats, problemCount: problems.length }, null, 2));
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
}
