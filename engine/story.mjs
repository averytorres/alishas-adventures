export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'es', 'gu']);

export function validateStory(story) {
  const problems = [];
  if (!story || typeof story !== 'object') return ['Story must be an object'];
  if (typeof story.id !== 'string' || !story.id) problems.push('Missing story id');
  if (!story.scenes || typeof story.scenes !== 'object') return [...problems, 'Missing scenes'];
  if (!story.scenes[story.start]) problems.push('Start scene does not exist');
  const ids = Object.keys(story.scenes);
  for (const id of ids) {
    const scene = story.scenes[id];
    if (typeof scene.situation !== 'string' || !scene.situation.trim()) problems.push(`${id}: missing situation`);
    if (!Array.isArray(scene.choices) || scene.choices.length < 2 || scene.choices.length > 3) {
      problems.push(`${id}: expected 2 or 3 choices`);
      continue;
    }
    for (const choice of scene.choices) {
      if (typeof choice.text !== 'string' || !choice.text.trim()) problems.push(`${id}: choice has no spoken text`);
      if (!['$home', '$restart'].includes(choice.next) && !story.scenes[choice.next]) problems.push(`${id}: missing destination ${choice.next}`);
    }
    if (new Set(scene.choices.map(choice => choice.next)).size !== scene.choices.length) problems.push(`${id}: choices share the same immediate destination`);
  }
  if (story.scenes[story.start]) {
    const seen = new Set(), pending = [story.start];
    while (pending.length) {
      const id = pending.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const choice of story.scenes[id].choices || []) if (story.scenes[choice.next] && !seen.has(choice.next)) pending.push(choice.next);
    }
    for (const id of ids) if (!seen.has(id)) problems.push(`${id}: unreachable from start`);
  }
  const endingIds = ids.filter(id => story.scenes[id].ending);
  if (!endingIds.length) problems.push('Story has no ending');
  const canReachEnding = new Set(endingIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of ids) if (!canReachEnding.has(id) && story.scenes[id].choices?.some(choice => canReachEnding.has(choice.next))) {
      canReachEnding.add(id); grew = true;
    }
  }
  for (const id of ids) if (!canReachEnding.has(id)) problems.push(`${id}: cannot reach an ending`);
  return problems;
}

export function createSession(story, savedSceneId = story.start) {
  const problems = validateStory(story);
  if (problems.length) throw new Error(`Invalid story: ${problems.join('; ')}`);
  let current = story.scenes[savedSceneId] ? savedSceneId : story.start;
  return {
    get id() { return current; },
    get scene() { return story.scenes[current]; },
    choose(index) {
      const choice = story.scenes[current].choices[index];
      if (!choice) throw new RangeError('Choice does not exist');
      if (choice.next === '$home') return { action: 'home' };
      current = choice.next === '$restart' ? story.start : choice.next;
      return { action: 'scene', id: current };
    }
  };
}

export function narrationSequence(scene) {
  return [scene.situation, ...scene.choices.map(choice => choice.text)];
}

export function countNarrationCharacters(story) {
  return Object.values(story.scenes).reduce((count, scene) => count + narrationSequence(scene).reduce((n, line) => n + line.length, 0), 0);
}
