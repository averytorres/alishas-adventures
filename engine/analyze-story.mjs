import fs from 'node:fs';
import { validateStory, countNarrationCharacters, narrationSequence } from './story.mjs';
const path = process.argv[2];
if (!path) throw new Error('Usage: node analyze-story.mjs story.json');
const story = JSON.parse(fs.readFileSync(path, 'utf8'));
const problems = validateStory(story);
if (problems.length) throw new Error(problems.join('\n'));
const routes = [];
function visit(id, visited, chars) {
  if (visited.includes(id)) return;
  const scene = story.scenes[id];
  const total = chars + narrationSequence(scene).reduce((sum, line) => sum + line.length, 0);
  if (scene.ending) { routes.push({ ids: [...visited, id], chars: total, ending: scene.ending }); return; }
  for (const choice of scene.choices) if (story.scenes[choice.next]) visit(choice.next, [...visited, id], total);
}
visit(story.start, [], 0);
routes.sort((a, b) => a.chars - b.chars);
const chars = countNarrationCharacters(story);
console.log(JSON.stringify({story:story.id, scenes:Object.keys(story.scenes).length, uniqueEnglishCharacters:chars, roughThreeLanguageCreditsAtOnePerCharacter:chars*3, routeCount:routes.length, shortestRoute:routes[0], longestRoute:routes.at(-1)},null,2));
