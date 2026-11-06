import assert from 'node:assert/strict';
import { validateStory, createSession, narrationSequence, countNarrationCharacters } from './story.mjs';
const story = { id: 'test', start: 'start', scenes: {
  start: { situation: 'A dragon arrives.', choices: [{ text: 'Help it.', next: 'end' }, { text: 'Ask why.', next: 'end2' }] },
  end: { situation: 'The dragon is safe.', ending: 'happy', choices: [{ text: 'Play again.', next: '$restart' }, { text: 'Go home.', next: '$home' }] },
  end2: { situation: 'The dragon tells its story.', ending: 'happy', choices: [{ text: 'Play again.', next: '$restart' }, { text: 'Go home.', next: '$home' }] }
}};
assert.deepEqual(validateStory(story), []);
const session = createSession(story);
assert.deepEqual(narrationSequence(session.scene), ['A dragon arrives.', 'Help it.', 'Ask why.']);
assert.equal(session.choose(0).id, 'end');
assert.equal(session.choose(1).action, 'home');
assert.equal(session.choose(0).id, 'start');
assert.ok(countNarrationCharacters(story) > 0);
const broken = structuredClone(story);broken.scenes.start.choices[0].next = 'missing';
assert.match(validateStory(broken).join(' '), /missing destination/);
console.log('Story graph checks passed.');
