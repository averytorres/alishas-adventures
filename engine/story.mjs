export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'es', 'gu']);

const SPECIAL_DESTINATIONS = ['$home', '$restart'];

function validateScene(story, id, problems) {
  const scene = story.scenes[id];

  if (typeof scene.situation !== 'string' || !scene.situation.trim()) {
    problems.push(`${id}: missing situation`);
  }
  if (!Array.isArray(scene.choices) || scene.choices.length < 2 || scene.choices.length > 3) {
    problems.push(`${id}: expected 2 or 3 choices`);
    return;
  }

  for (const choice of scene.choices) {
    if (typeof choice.text !== 'string' || !choice.text.trim()) {
      problems.push(`${id}: choice has no spoken text`);
    }
    if (!SPECIAL_DESTINATIONS.includes(choice.next) && !story.scenes[choice.next]) {
      problems.push(`${id}: missing destination ${choice.next}`);
    }
  }

  const destinations = scene.choices.map(choice => choice.next);
  if (new Set(destinations).size !== destinations.length) {
    problems.push(`${id}: choices share the same immediate destination`);
  }
}

function reachableFromStart(story) {
  const reachable = new Set();
  const pending = [story.start];

  while (pending.length) {
    const id = pending.pop();
    if (reachable.has(id)) continue;

    reachable.add(id);
    for (const choice of story.scenes[id].choices || []) {
      if (story.scenes[choice.next] && !reachable.has(choice.next)) {
        pending.push(choice.next);
      }
    }
  }

  return reachable;
}

function scenesThatCanReachEnding(story, ids, endingIds) {
  const reachable = new Set(endingIds);
  let foundMore = true;

  // Add predecessors until no additional scene leads to a known ending path.
  while (foundMore) {
    foundMore = false;
    for (const id of ids) {
      if (!reachable.has(id) && story.scenes[id].choices?.some(choice => reachable.has(choice.next))) {
        reachable.add(id);
        foundMore = true;
      }
    }
  }

  return reachable;
}

export function validateStory(story) {
  const problems = [];
  if (!story || typeof story !== 'object') return ['Story must be an object'];
  if (typeof story.id !== 'string' || !story.id) problems.push('Missing story id');
  if (!story.scenes || typeof story.scenes !== 'object') return [...problems, 'Missing scenes'];
  if (!story.scenes[story.start]) problems.push('Start scene does not exist');

  const ids = Object.keys(story.scenes);
  for (const id of ids) validateScene(story, id, problems);

  if (story.scenes[story.start]) {
    const reachable = reachableFromStart(story);
    for (const id of ids) {
      if (!reachable.has(id)) problems.push(`${id}: unreachable from start`);
    }
  }

  const endingIds = ids.filter(id => story.scenes[id].ending);
  if (!endingIds.length) problems.push('Story has no ending');

  const canReachEnding = scenesThatCanReachEnding(story, ids, endingIds);
  for (const id of ids) {
    if (!canReachEnding.has(id)) problems.push(`${id}: cannot reach an ending`);
  }
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
  let count = 0;
  for (const scene of Object.values(story.scenes)) {
    for (const line of narrationSequence(scene)) count += line.length;
  }
  return count;
}
