import { validateStory } from './story.mjs';

// Localized lines share stable IDs with the English story graph. Missing text is an error.
export function localizeStory(story, locale) {
  if (!['en', 'es', 'gu'].includes(locale.language)) throw new Error(`Unsupported language: ${locale.language}`);
  const lines = locale.lines;
  const get = id => {
    const line = lines[id];
    if (typeof line !== 'string' || !line.trim()) throw new Error(`Missing ${locale.language} line: ${id}`);
    return line;
  };
  const translated = {
    ...story,
    title: get(`${story.id}.title`),
    description: get(`${story.id}.description`),
    scenes: Object.fromEntries(Object.entries(story.scenes).map(([id, scene]) => [id, {
      ...scene,
      situation: get(`${id}.situation`),
      hint: get(`${id}.hint`),
      choices: scene.choices.map((choice, index) => ({ ...choice, text: get(`${id}.choice.${index}`) }))
    }]))
  };
  const problems = validateStory(translated);
  if (problems.length) throw new Error(problems.join('; '));
  return translated;
}
