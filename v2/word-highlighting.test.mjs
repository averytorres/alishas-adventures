import assert from 'node:assert/strict';
import test from 'node:test';
import { wordParts, timedWordsFor, wordIndexAtTime, wordScrollDelta } from './word-highlighting.mjs';

test('preserves English, Spanish, and Gujarati paragraph text while splitting visible words', () => {
  for (const text of ["Alisha looked up. 'A star!'", '¡Mira la estrella, Alisha!', 'આલીશાએ ઉપર જોયું. તારો ક્યાં ગયો?']) {
    assert.equal(wordParts(text).join(''), text);
    assert.equal(wordParts(text).filter(part => !/^\s+$/u.test(part)).length, text.trim().split(/\s+/u).length);
  }
});

test('uses only timings for the exact displayed recording text', () => {
  const line = { text: 'A little star.' };
  const words = [[0.2, 0.4], [0.48, 0.8], [0.9, 1.2]];
  assert.deepEqual(timedWordsFor(line, { text: line.text, words }), words);
  assert.equal(timedWordsFor(line, { text: 'A different star.', words }), null);
  assert.equal(timedWordsFor(line, { text: line.text, words: words.slice(1) }), null);
  assert.equal(timedWordsFor(line, { text: line.text, words: [[0.2, 0.4], [0.48, 0.48], [0.9, 1.2]] }), null);
});

test('highlights the spoken word and clears through pauses', () => {
  const words = [[0.2, 0.4], [0.48, 0.8], [0.9, 1.2]];
  assert.equal(wordIndexAtTime(words, 0.1), null);
  assert.equal(wordIndexAtTime(words, 0.3), 0);
  assert.equal(wordIndexAtTime(words, 0.45), null);
  assert.equal(wordIndexAtTime(words, 0.6), 1);
  assert.equal(wordIndexAtTime(words, 1.3), null);
});

test('scrolls only when the spoken word leaves the comfortable reading band', () => {
  assert.equal(wordScrollDelta({ top: 500, bottom: 530 }, 1000), 0);
  assert.equal(wordScrollDelta({ top: 720, bottom: 750 }, 1000), 150);
  assert.equal(wordScrollDelta({ top: 80, bottom: 110 }, 1000), -170);
  assert.equal(wordScrollDelta(null, 1000), 0);
});
