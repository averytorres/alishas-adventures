import fs from 'node:fs';
import { countNarrationCharacters } from '../engine/story.mjs';
const path = process.argv[2];
const balance = Number(process.argv[3]);
if (!path || !Number.isFinite(balance)) throw new Error('Usage: node credit-estimate.mjs story.json availableCredits');
const story = JSON.parse(fs.readFileSync(path, 'utf8'));
const english = countNarrationCharacters(story) + (story.description?.length || 0);
const hints = Object.values(story.scenes).reduce((sum, scene) => sum + (scene.hint?.length || 0), 0);
const baseline = english + hints;
console.log(JSON.stringify({
  story: story.id,
  availableCredits: balance,
  englishCharactersIncludingHintsAndTeaser: baseline,
  roughThreeLanguageMinimumAtOneCreditPerCharacter: baseline * 3,
  budgetDifferenceBeforeTranslationsAndRetakes: balance - baseline * 3,
  caveat: 'Spanish and Gujarati character counts, UI speech, retakes, and model-specific rates are not yet included. This is not a quote.'
}, null, 2));
