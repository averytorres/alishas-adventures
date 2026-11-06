import test from 'node:test';
import assert from 'node:assert/strict';
import { playAudioUrl, NarrationController } from './narration.mjs';

test('playback rejection stops the sequence and reports the failure', async () => {
  const original = globalThis.Audio;
  const heard = [];
  globalThis.Audio = class {
    play() { return Promise.reject(new Error('playback blocked')); }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  try {
    const controller = new NarrationController({
      highlight() {},
      playLine: async (line, signal) => { heard.push(line); await playAudioUrl(line, signal); }
    });
    await assert.rejects(controller.play(['first', 'second']), /playback blocked/);
    assert.deepEqual(heard, ['first']);
    assert.equal(controller.active, null);
  } finally { globalThis.Audio = original; }
});

test('media error rejects while an explicit stop resolves', async () => {
  const original = globalThis.Audio;
  let player;
  globalThis.Audio = class {
    constructor() { player = this; }
    play() { return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  try {
    const failed = playAudioUrl('bad.mp3', new AbortController().signal);
    player.onerror();
    await assert.rejects(failed, /Could not play audio: bad\.mp3/);

    const run = new AbortController();
    const stopped = playAudioUrl('slow.mp3', run.signal);
    run.abort();
    await stopped;
  } finally { globalThis.Audio = original; }
});
