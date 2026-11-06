import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSession, validateStory } from '../engine/story.mjs';
import { localizeStory } from '../engine/localize-story.mjs';
import { startOrResume, advance } from '../v2/state.mjs';

const root = new URL('../', import.meta.url);
const read = relative => JSON.parse(fs.readFileSync(new URL(relative, root), 'utf8'));
const base = read('story/alisha-lost-star.json');

test('every localized branch reaches its intended ending and replay resets', () => {
  for (const code of ['en', 'es', 'gu']) {
    const localized = localizeStory(base, read(`story/locales/${code}.draft.json`));
    assert.deepEqual(validateStory(localized), []);
    const endings = new Set();
    const visited = new Set();
    const queue = [[localized.start, []]];
    while (queue.length) {
      const [id, path] = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const scene = localized.scenes[id];
      if (scene.ending) {
        endings.add(id);
        assert.ok(scene.choices.some(choice => choice.next === '$home'));
        assert.ok(scene.choices.some(choice => choice.next === '$restart' || localized.scenes[choice.next]));
        const session = createSession(localized);
        for (const index of path) session.choose(index);
        assert.equal(session.id, id);
        const home = scene.choices.findIndex(choice => choice.next === '$home');
        assert.equal(session.choose(home).action, 'home');
        assert.equal(session.id, id);
        const retry = scene.choices.findIndex(choice => choice.next !== '$home');
        assert.equal(session.choose(retry).id, scene.choices[retry].next === '$restart' ? localized.start : scene.choices[retry].next);
      }
      scene.choices.forEach((choice, index) => {
        if (localized.scenes[choice.next] && !visited.has(choice.next)) queue.push([choice.next, [...path, index]]);
      });
    }
    assert.equal(visited.size, Object.keys(localized.scenes).length, `${code}: scene coverage`);
    assert.equal(endings.size, 10, `${code}: ending coverage`);
    const progress = {};
    const initial = startOrResume(localized, progress);
    assert.equal(initial.id, localized.start);
    const first = advance(initial, 0, localized, progress);
    assert.equal(startOrResume(localized, progress).id, first.id);
  }
});
