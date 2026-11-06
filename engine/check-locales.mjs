import fs from 'node:fs';
import path from 'node:path';
import { SUPPORTED_LANGUAGES } from './story.mjs';

const folder = process.argv[2];
if (!folder) throw new Error('Usage: node check-locales.mjs story/locales');

const storyPath = path.resolve(folder, '..', 'alisha-lost-star.json');
const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
const readLocale = fileName => JSON.parse(fs.readFileSync(`${folder}/${fileName}`, 'utf8'));
const locales = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(code => [code, readLocale(`${code}.draft.json`)])
);
const problems = [];

function sourceStoryLines(story) {
  const lines = {
    [`${story.id}.title`]: story.title,
    [`${story.id}.description`]: story.description
  };

  for (const [id, scene] of Object.entries(story.scenes)) {
    lines[`${id}.situation`] = scene.situation;
    lines[`${id}.hint`] = scene.hint;
    scene.choices.forEach((choice, index) => {
      lines[`${id}.choice.${index}`] = choice.text;
    });
  }
  return lines;
}

function checkLineKeys(locale, expectedKeys, code, label = '') {
  const keys = Object.keys(locale.lines).sort();
  for (const key of expectedKeys) {
    if (!keys.includes(key) || typeof locale.lines[key] !== 'string' || !locale.lines[key].trim()) {
      problems.push(`${code}: missing ${label}${key}`);
    }
  }
  for (const key of keys) {
    if (!expectedKeys.includes(key)) problems.push(`${code}: extra ${label}${key}`);
  }
}

const GUJARATI_SCRIPT = /[\u0A80-\u0AFF]/;
function checkGujaratiScript(lines, label = '') {
  for (const [key, line] of Object.entries(lines)) {
    if (!GUJARATI_SCRIPT.test(line)) problems.push(`gu: no Gujarati script in ${label}${key}`);
  }
}

const masterKeys = Object.keys(locales.en.lines).sort();
const sourceLines = sourceStoryLines(story);
for (const [id, value] of Object.entries(sourceLines)) {
  if (locales.en.lines[id] !== value) problems.push(`en: differs from story source: ${id}`);
}
for (const id of masterKeys) {
  if (!(id in sourceLines)) problems.push(`en: extra line absent from story source: ${id}`);
}

for (const code of SUPPORTED_LANGUAGES) {
  const locale = locales[code];
  if (locale.language !== code) problems.push(`${code}: incorrect language tag`);
  if (code !== 'en' && !['DRAFT_NEEDS_NATIVE_REVIEW', 'DRAFT_AI_REVIEWED'].includes(locale.status)) {
    problems.push(`${code}: expected draft review status`);
  }
  checkLineKeys(locale, masterKeys, code);
  if (code === 'gu') checkGujaratiScript(locale.lines);
}

const uiLocales = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(code => [code, readLocale(`ui.${code}.draft.json`)])
);
const uiKeys = Object.keys(uiLocales.en.lines).sort();
for (const code of SUPPORTED_LANGUAGES) {
  const locale = uiLocales[code];
  if (locale.language !== code) problems.push(`${code}: incorrect UI language tag`);
  checkLineKeys(locale, uiKeys, code, 'UI line ');
  if (code === 'gu') checkGujaratiScript(locale.lines, 'UI line ');
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`All three draft locales have ${masterKeys.length} matching story lines and ${uiKeys.length} UI lines. Fluent human review has not occurred.`);
}
