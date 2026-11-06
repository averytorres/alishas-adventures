import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localizeStory } from '../engine/localize-story.mjs';
import { narrationSequence } from '../engine/story.mjs';
import { normalizeState, startOrResume, advance, makeHoldHandler, makeSpeechCooldown } from './state.mjs';
import { createNarrator } from './narration.mjs';

const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const base = json('../story/alisha-lost-star.json');
const locales = Object.fromEntries(['en','es','gu'].map(code => [code, json(`../story/locales/${code}.draft.json`)]));

test('all preview locales produce complete playable stories', () => {
  for (const code of ['en','es','gu']) {
    const story = localizeStory(base, locales[code]);
    assert.equal(Object.keys(story.scenes).length, Object.keys(base.scenes).length);
    assert.ok(story.scenes[story.start].choices.length >= 2);
  }
});

test('saved progress resumes per story and choices persist', () => {
  const progress = {};
  const session = startOrResume(base, progress);
  const next = base.scenes[base.start].choices[0].next;
  assert.equal(advance(session, 0, base, progress).id, next);
  assert.equal(startOrResume(base, progress).id, next);
  assert.equal(startOrResume(base, progress, true).id, base.start);
  assert.equal(normalizeState({ language: 'fr', princess: 'invalid', progress: { [base.id]: 'not-a-scene' } }, [base]).language, 'en');
});

test('hold repeats without selecting; tap selects', async () => {
  let holds = 0, taps = 0;
  const h = makeHoldHandler({ onHold: () => holds++, onTap: () => taps++, delay: 5 });
  const event = { button: 0, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} };
  h.pointerdown(event); await new Promise(resolve => setTimeout(resolve, 15)); h.pointerup(); h.click(event);
  assert.deepEqual([holds,taps], [1,0]);
  h.pointerdown(event); h.pointerup(); h.click(event);
  assert.deepEqual([holds,taps], [1,1]);
  h.pointerdown(event); h.pointermove({ clientX: 40, clientY: 0 }); h.pointerup(); h.click(event);
  assert.deepEqual([holds,taps], [1,1]);
});

test('speech controls ignore an accidental repeat, then allow another request', () => {
  let clock = 0;
  const heard = [];
  const replay = makeSpeechCooldown(() => heard.push('replay'), 1500, () => clock);
  const help = makeSpeechCooldown(() => heard.push('help'), 1500, () => clock);
  replay();
  clock = 100;
  replay();
  help();
  clock = 1600;
  replay();
  assert.deepEqual(heard, ['replay', 'help', 'replay']);
});

test('missing recordings report pending and never highlight as if playing', async () => {
  const statuses = [], highlights = [];
  const narrator = createNarrator({ language: 'es', onStatus: value => statuses.push(value), onHighlight: value => highlights.push(value) });
  const story = localizeStory(base, locales.es);
  const lines = narrationSequence(story.scenes[story.start]).map((text, index) => ({ id: index ? `${story.start}.choice.${index-1}` : `${story.start}.situation`, text }));
  assert.equal(await narrator.play(lines), false);
  assert.match(statuses.at(-1), /Narration pending/);
  assert.ok(!highlights.some(value => Number.isInteger(value)));
});
