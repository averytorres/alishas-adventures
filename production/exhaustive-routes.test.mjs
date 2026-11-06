import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = file => pathToFileURL(path.join(root, file)).href;
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const { createSession, validateStory } = await import(source('engine/story.mjs'));
const { localizeStory } = await import(source('engine/localize-story.mjs'));
const { advance, startOrResume, normalizeState } = await import(source('v2/state.mjs'));
const base = read('story/alisha-lost-star.json');
const ids = Object.keys(base.scenes);
const routes = [];
const visitedScenes = new Set();
const visitedEdges = new Set();
const endingIds = new Set();
function walk(id, choices, stack) {
  assert.ok(!stack.has(id), `cycle at ${id}`);
  visitedScenes.add(id);
  const scene = base.scenes[id];
  assert.ok(scene, `missing scene ${id}`);
  if (scene.ending) { routes.push({ choices, ending: id }); endingIds.add(id); return; }
  const nextStack = new Set([...stack, id]);
  scene.choices.forEach((choice, index) => {
    assert.ok(base.scenes[choice.next], `premature action at ${id}/${index}`);
    visitedEdges.add(`${id}/${index}`);
    walk(choice.next, [...choices, index], nextStack);
  });
}
walk(base.start, [], new Set());
assert.equal(visitedScenes.size, ids.length);
assert.equal(endingIds.size, 10);
const counts = {};
for (const language of ['en', 'es', 'gu']) {
  const localized = localizeStory(base, read(`story/locales/${language}.draft.json`));
  assert.deepEqual(validateStory(localized), [], language);
  const progress = {};
  const observedEndings = new Set();
  for (const route of routes) {
    const session = createSession(localized);
    for (const index of route.choices) {
      const from = session.id;
      const expected = localized.scenes[from].choices[index].next;
      const result = advance(session, index, localized, progress);
      assert.equal(result.id, expected, `${language}: ${from}/${index}`);
      assert.equal(session.id, expected);
      assert.equal(progress[localized.id], expected);
    }
    assert.equal(session.id, route.ending, language);
    observedEndings.add(session.id);
    const ending = session.scene;
    const home = ending.choices.findIndex(choice => choice.next === '$home');
    const retry = ending.choices.findIndex(choice => choice.next !== '$home');
    assert.ok(home >= 0 && retry >= 0, `${language}: ${session.id} missing home/retry`);
    assert.deepEqual(advance(session, home, localized, progress), { action: 'home' });
    assert.equal(session.id, route.ending);
    assert.equal(progress[localized.id], route.ending);
    const destination = ending.choices[retry].next === '$restart' ? localized.start : ending.choices[retry].next;
    assert.equal(advance(session, retry, localized, progress).id, destination);
    assert.equal(progress[localized.id], destination);
  }
  for (const id of ids) {
    const resumed = startOrResume(localized, { [localized.id]: id });
    assert.equal(resumed.id, id, `${language}: resume ${id}`);
    assert.equal(startOrResume(localized, { [localized.id]: id }, true).id, localized.start);
    assert.equal(normalizeState({ language, progress: { [localized.id]: id } }, [localized]).progress[localized.id], id);
  }
  assert.deepEqual(observedEndings, endingIds);
  counts[language] = { routes: routes.length, transitions: routes.reduce((n, route) => n + route.choices.length, 0), endings: observedEndings.size, resumableScenes: ids.length };
}
console.log(JSON.stringify({ scenes: visitedScenes.size, edges: visitedEdges.size, uniqueRoutes: routes.length, languages: counts }, null, 2));
