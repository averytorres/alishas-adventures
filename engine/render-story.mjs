import fs from 'node:fs';
import { localizeStory } from './localize-story.mjs';

const [inputPath, outputPath, localePath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: node render-story.mjs story.json output.md [locale.json]');
}

const originalStory = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const story = localePath
  ? localizeStory(originalStory, JSON.parse(fs.readFileSync(localePath, 'utf8')))
  : originalStory;
const reviewStatus = localePath
  ? 'AI-reviewed translation draft; fluent human review unavailable'
  : 'English story draft for review';
const lines = [
  `# ${story.title}`,
  '',
  `**Status:** ${reviewStatus}. Narration status is tracked in audio/manifest.json.`,
  '',
  `**Library preview:** ${story.description}`,
  '',
  `**Starting screen:** ${story.start}`,
  ''
];

for (const [id, scene] of Object.entries(story.scenes)) {
  const endingLabel = scene.ending ? ` — ${scene.ending} ending` : '';
  lines.push(`## ${id}${endingLabel}`, '', scene.situation, '', '**Choices**', '');
  scene.choices.forEach((choice, index) => {
    lines.push(`${index + 1}. ${choice.text} → ${choice.next}`);
  });
  lines.push('', `**Help:** ${scene.hint}`, '');
}

fs.writeFileSync(outputPath, lines.join('\n'));
console.log(`Wrote ${Object.keys(story.scenes).length} scenes to ${outputPath}`);
