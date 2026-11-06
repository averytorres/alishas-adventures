import assert from 'node:assert/strict';
import { NarrationController } from './narration.mjs';
const heard = [], highlighted = [];
let release;
const narrator = new NarrationController({
  highlight: (i, line) => highlighted.push({ index: i, line }),
  playLine: (line, signal) => new Promise(resolve => {
    heard.push(line);
    release = resolve;
    signal.addEventListener('abort', resolve, { once: true });
  })
});
const first = narrator.play(['situation', 'choice A']);
assert.deepEqual(heard, ['situation']);
const second = narrator.play(['choice B']);
await first;
assert.deepEqual(heard, ['situation', 'choice B']);
assert.deepEqual(highlighted.at(-1), { index: 0, line: 'choice B' });
release();
await second;
assert.deepEqual(highlighted.at(-1), { index: null, line: undefined });
console.log('Narration cancellation check passed.');
