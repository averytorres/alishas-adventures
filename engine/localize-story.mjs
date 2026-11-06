import { SUPPORTED_LANGUAGES, validateStory } from './story.mjs';

// Localized lines share stable IDs with the English story graph. Missing text is an error.
export function localizeStory(story, locale) {
  if (!SUPPORTED_LANGUAGES.includes(locale.language)) {
    throw new Error(`Unsupported language: ${locale.language}`);
  }
  const lines = locale.lines;
  const getLine = id => {
    const line = lines[id];
    if (typeof line !== 'string' || !line.trim()) {
      throw new Error(`Missing ${locale.language} line: ${id}`);
    }
    return line;
  };

  const translated = {
    ...story,
    title: getLine(`${story.id}.title`),
    description: getLine(`${story.id}.description`),
    scenes: Object.fromEntries(
      Object.entries(story.scenes).map(([id, scene]) => [id, {
        ...scene,
        situation: getLine(`${id}.situation`),
        hint: getLine(`${id}.hint`),
        choices: scene.choices.map((choice, index) => ({
          ...choice,
          text: getLine(`${id}.choice.${index}`)
        }))
      }])
    )
  };

  const problems = validateStory(translated);
  if (problems.length) throw new Error(problems.join('; '));
  return translated;
}
