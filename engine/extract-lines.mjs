import fs from 'node:fs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: node extract-lines.mjs story.json output.json');
}

const story = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
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

const locale = { language: 'en', status: 'DRAFT_UNREVIEWED', lines };
fs.writeFileSync(outputPath, JSON.stringify(locale, null, 2) + '\n');
console.log(`Extracted ${Object.keys(lines).length} English lines to ${outputPath}`);
