import fs from 'node:fs';
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node extract-lines.mjs story.json output.json');
const story = JSON.parse(fs.readFileSync(input, 'utf8'));
const lines = { [`${story.id}.title`]: story.title, [`${story.id}.description`]: story.description };
for (const [id, scene] of Object.entries(story.scenes)) {
  lines[`${id}.situation`] = scene.situation;
  lines[`${id}.hint`] = scene.hint;
  scene.choices.forEach((choice, index) => { lines[`${id}.choice.${index}`] = choice.text; });
}
fs.writeFileSync(output, JSON.stringify({ language: 'en', status: 'DRAFT_UNREVIEWED', lines }, null, 2) + '\n');
console.log(`Extracted ${Object.keys(lines).length} English lines to ${output}`);
