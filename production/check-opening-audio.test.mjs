import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('opening check rejects stale text even when MP3 files are present', t => {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-opening-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const put = (name, content) => {
    const file = path.join(fixture, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(content) ? content : JSON.stringify(content));
  };
  put('production/check-opening-audio.mjs', fs.readFileSync(path.join(root, 'production/check-opening-audio.mjs')));
  put('production/voice-plan.json', { voices: Object.fromEntries(['en', 'es', 'gu'].map(lang => [lang, { name: lang }])) });
  const ids = ['library.instruction', 'alisha-lost-star.description', 'castle_gate.situation', 'castle_gate.choice.0', 'castle_gate.choice.1', 'castle_gate.hint'];
  const manifest = { voices: { en: 'en', es: 'es', gu: 'gu' }, recordings: {}, textHashes: {} };
  for (const lang of ['en', 'es', 'gu']) {
    const storyLines = {}, uiLines = {};
    manifest.recordings[lang] = {};
    manifest.textHashes[lang] = {};
    for (const id of ids) {
      const text = `${lang} ${id}`;
      (id.startsWith('library.') ? uiLines : storyLines)[id] = text;
      manifest.recordings[lang][id] = `../audio/${lang}/${id}.mp3`;
      manifest.textHashes[lang][id] = crypto.createHash('sha256').update(text).digest('hex');
      put(`audio/${lang}/${id}.mp3`, Buffer.concat([Buffer.from('ID3'), Buffer.alloc(1200)]));
    }
    put(`story/locales/${lang}.draft.json`, { lines: storyLines });
    put(`story/locales/ui.${lang}.draft.json`, { lines: uiLines });
  }
  put('audio/manifest.json', manifest);
  const check = () => spawnSync(process.execPath, [path.join(fixture, 'production/check-opening-audio.mjs')], { encoding: 'utf8' });
  assert.equal(check().status, 0);
  const enPath = path.join(fixture, 'story/locales/en.draft.json');
  const en = JSON.parse(fs.readFileSync(enPath));
  en.lines['castle_gate.situation'] += ' changed';
  fs.writeFileSync(enPath, JSON.stringify(en));
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /en\/castle_gate\.situation: recording text is stale/);
});
