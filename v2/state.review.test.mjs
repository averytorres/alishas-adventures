import test from 'node:test';
import assert from 'node:assert/strict';
import { browserStorage, readSavedState, writeSavedState, normalizeState, makeHoldHandler, narrationCoverageMessage, choiceScrollDelta } from './state.mjs';

test('damaged or inaccessible saves open with safe defaults', () => {
  const stories = [{ id: 'story', scenes: { start: {} } }];
  assert.deepEqual(normalizeState(readSavedState({ getItem: () => '{broken' }), stories), { language: 'en', princess: 'adventure', progress: {} });
  assert.deepEqual(normalizeState(readSavedState({ getItem: () => { throw new Error('storage blocked'); } }), stories), { language: 'en', princess: 'adventure', progress: {} });
  const stored = { language: 'gu', princess: 'star', progress: { story: 'start' } };
  assert.deepEqual(normalizeState(readSavedState({ getItem: () => JSON.stringify(stored) }), stories), stored);
  assert.equal(writeSavedState({ setItem: () => { throw new Error('quota reached'); } }, stored), false);
  let saved;
  assert.equal(writeSavedState({ setItem: (_key, value) => { saved = JSON.parse(value); } }, stored), true);
  assert.deepEqual(saved, stored);
});

test('a blocked browser storage getter does not prevent the library from opening', () => {
  const browser = { get localStorage() { throw new Error('Storage blocked'); } };
  assert.equal(browserStorage(browser), null);
  assert.equal(readSavedState(browserStorage(browser)), null);
  assert.equal(writeSavedState(browserStorage(browser), { language: 'en' }), false);
  const storage = { getItem: () => null };
  assert.equal(browserStorage({ localStorage: storage }), storage);
});

test('a second touch cancels a hold and does not select a choice', async () => {
  let holds = 0, taps = 0, prevented = 0;
  const handler = makeHoldHandler({ onHold: () => holds++, onTap: () => taps++, delay: 5 });
  const event = (pointerId, isPrimary = true) => ({ pointerId, isPrimary, button: 0, clientX: 0, clientY: 0, preventDefault() { prevented++; }, stopPropagation() {} });
  handler.pointerdown(event(1));
  handler.pointerdown(event(2, false));
  await new Promise(resolve => setTimeout(resolve, 12));
  handler.pointerup(event(1));
  handler.click({ ...event(1), detail: 1 });
  assert.deepEqual([holds, taps, prevented], [0, 0, 1]);
  handler.click({ ...event(1), detail: 0 });
  assert.equal(taps, 1, 'keyboard activation still works after a canceled gesture');
});

test('narration status reflects the current screen instead of a fixed route count', () => {
  assert.equal(narrationCoverageMessage({ a: 'a.mp3', b: 'b.mp3' }, ['a', 'b']), 'Recorded narration is ready on this screen.');
  assert.equal(narrationCoverageMessage({ a: 'a.mp3' }, ['a'], 'es'), 'La narración grabada está lista en esta pantalla.');
  assert.equal(narrationCoverageMessage({ a: 'a.mp3' }, ['a'], 'gu'), 'આ પાનાનું રેકોર્ડ કરેલું વાચન તૈયાર છે.');
  assert.match(narrationCoverageMessage({ a: 'a.mp3' }, ['a', 'b']), /^1 spoken line/);
});

test('choice scrolling stays below the sticky stage on a short portrait screen', () => {
  assert.equal(choiceScrollDelta({ top: 225, bottom: 297 }, 250, 360), -39);
  assert.equal(choiceScrollDelta({ top: 280, bottom: 352 }, 250, 360), 10);
  assert.equal(choiceScrollDelta({ top: 270, bottom: 330 }, 250, 360), 0);
});
