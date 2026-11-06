import fs from 'node:fs';
import { localizeStory } from './localize-story.mjs';
const [input, output, localePath] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node render-story.mjs story.json output.md [locale.json]');
const original = JSON.parse(fs.readFileSync(input, 'utf8'));
const story = localePath ? localizeStory(original, JSON.parse(fs.readFileSync(localePath, 'utf8'))) : original;
const lines = [`# ${story.title}`, '', `**Status:** ${localePath ? 'AI-reviewed translation draft; fluent human review unavailable' : 'English story draft for review'}. Narration status is tracked in audio/manifest.json.`, '', `**Library preview:** ${story.description}`, '', `**Starting screen:** ${story.start}`, ''];
for (const [id, scene] of Object.entries(story.scenes)) {
  lines.push(`## ${id}${scene.ending ? ` — ${scene.ending} ending` : ''}`, '', scene.situation, '', '**Choices**', '');
  scene.choices.forEach((choice, i) => lines.push(`${i + 1}. ${choice.text} → ${choice.next}`));
  lines.push('', `**Help:** ${scene.hint}`, '');
}
fs.writeFileSync(output, lines.join('\n'));
console.log(`Wrote ${Object.keys(story.scenes).length} scenes to ${output}`);
