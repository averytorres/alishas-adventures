import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarrator } from './narration.mjs';

test('replaced and stopped narration cannot report completion', async () => {
  const originalAudio = globalThis.Audio;
  const players = [];
  const statuses = [];
  globalThis.Audio = class {
    constructor(url) { this.url = url; players.push(this); }
    play() { return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  try {
    const narrator = createNarrator({
      language: 'en',
      audioManifest: { en: { 'ending.situation': 'ending.mp3', 'next.situation': 'next.mp3' } },
      onHighlight() {}, onStatus(message) { statuses.push(message); }
    });
    const ending = narrator.play([{ id: 'ending.situation', text: 'The end.' }]);
    const next = narrator.play([{ id: 'next.situation', text: 'A new scene.' }]);
    assert.equal(await ending, false);
    players.at(-1).onended();
    assert.equal(await next, true);
    assert.equal(statuses.at(-1), 'Recorded narration is ready on this screen.');

    const stopped = narrator.play([{ id: 'ending.situation', text: 'The end.' }]);
    narrator.stop();
    assert.equal(await stopped, false);
  } finally {
    globalThis.Audio = originalAudio;
  }
});
