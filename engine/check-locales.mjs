import fs from 'node:fs';
import path from 'node:path';
const folder = process.argv[2];
if (!folder) throw new Error('Usage: node check-locales.mjs story/locales');
const story = JSON.parse(fs.readFileSync(path.resolve(folder, '..', 'alisha-lost-star.json'), 'utf8'));
const paths = Object.fromEntries(['en','es','gu'].map(code => [code, `${folder}/${code}.draft.json`]));
const data = Object.fromEntries(Object.entries(paths).map(([code, path]) => [code, JSON.parse(fs.readFileSync(path, 'utf8'))]));
const master = Object.keys(data.en.lines).sort();
const problems = [];
const sourceLines = { [`${story.id}.title`]: story.title, [`${story.id}.description`]: story.description };
for (const [id, scene] of Object.entries(story.scenes)) {
  sourceLines[`${id}.situation`] = scene.situation;
  sourceLines[`${id}.hint`] = scene.hint;
  scene.choices.forEach((choice, index) => { sourceLines[`${id}.choice.${index}`] = choice.text; });
}
for (const [id, text] of Object.entries(sourceLines)) if (data.en.lines[id] !== text) problems.push(`en: differs from story source: ${id}`);
for (const id of master) if (!(id in sourceLines)) problems.push(`en: extra line absent from story source: ${id}`);
for (const code of ['en','es','gu']) {
  const locale = data[code];
  if (locale.language !== code) problems.push(`${code}: incorrect language tag`);
  if (!['DRAFT_NEEDS_NATIVE_REVIEW', 'DRAFT_AI_REVIEWED'].includes(locale.status) && code !== 'en') problems.push(`${code}: expected draft review status`);
  const keys = Object.keys(locale.lines).sort();
  for (const key of master) if (!keys.includes(key) || typeof locale.lines[key] !== 'string' || !locale.lines[key].trim()) problems.push(`${code}: missing ${key}`);
  for (const key of keys) if (!master.includes(key)) problems.push(`${code}: extra ${key}`);
  if (code === 'gu') {
    const Gujarati = /[\u0A80-\u0AFF]/;
    for (const [key, line] of Object.entries(locale.lines)) if (!Gujarati.test(line)) problems.push(`gu: no Gujarati script in ${key}`);
  }
}
const ui = Object.fromEntries(['en','es','gu'].map(code => [code, JSON.parse(fs.readFileSync(`${folder}/ui.${code}.draft.json`, 'utf8'))]));
const uiKeys = Object.keys(ui.en.lines).sort();
for (const code of ['en','es','gu']) {
  if (ui[code].language !== code) problems.push(`${code}: incorrect UI language tag`);
  for (const key of uiKeys) if (typeof ui[code].lines[key] !== 'string' || !ui[code].lines[key].trim()) problems.push(`${code}: missing UI line ${key}`);
  for (const key of Object.keys(ui[code].lines)) if (!uiKeys.includes(key)) problems.push(`${code}: extra UI line ${key}`);
  if (code === 'gu') for (const [key, line] of Object.entries(ui.gu.lines)) if (!/[\u0A80-\u0AFF]/.test(line)) problems.push(`gu: no Gujarati script in UI line ${key}`);
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log(`All three draft locales have ${master.length} matching story lines and ${uiKeys.length} UI lines. Fluent human review has not occurred.`);
