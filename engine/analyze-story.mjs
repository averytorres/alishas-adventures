import fs from 'node:fs';
import { validateStory, countNarrationCharacters, narrationSequence } from './story.mjs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node analyze-story.mjs story.json');

const story = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const problems = validateStory(story);
if (problems.length) throw new Error(problems.join('\n'));

const routes = [];
function visit(id, visited, characterCount) {
  if (visited.includes(id)) return; // A route cannot revisit a scene.

  const scene = story.scenes[id];
  const sceneCharacters = narrationSequence(scene).reduce((sum, line) => sum + line.length, 0);
  const total = characterCount + sceneCharacters;

  if (scene.ending) {
    routes.push({ ids: [...visited, id], chars: total, ending: scene.ending });
    return;
  }

  for (const choice of scene.choices) {
    if (story.scenes[choice.next]) visit(choice.next, [...visited, id], total);
  }
}

visit(story.start, [], 0);
routes.sort((first, second) => first.chars - second.chars);

const uniqueEnglishCharacters = countNarrationCharacters(story);
const analysis = {
  story: story.id,
  scenes: Object.keys(story.scenes).length,
  uniqueEnglishCharacters,
  roughThreeLanguageCreditsAtOnePerCharacter: uniqueEnglishCharacters * 3,
  routeCount: routes.length,
  shortestRoute: routes[0],
  longestRoute: routes.at(-1)
};
console.log(JSON.stringify(analysis, null, 2));
