import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const run = (script, args = [], cwd = os.tmpdir()) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });

test('alignment and opening scripts resolve the project and protect existing tracking', () => {
  const alignment = run(path.join(root, 'production/align-route-words.mjs'));
  assert.equal(alignment.status, 0, alignment.stderr);
  assert.match(alignment.stdout, /Situation recordings awaiting word alignment: 0/);

  const manifestPath = path.join(root, 'audio/manifest.json');
  const before = fs.readFileSync(manifestPath);
  const opening = run(path.join(root, 'production/generate-opening-audio.mjs'));
  assert.notEqual(opening.status, 0);
  assert.match(opening.stderr, /opening generation would overwrite recording and route tracking/);
  assert.deepEqual(fs.readFileSync(manifestPath), before);
});

test('route generation refuses to claim an existing recording without its text hash', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-audio-script-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const put = (name, content) => {
    const file = path.join(fixture, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof content === 'string' || Buffer.isBuffer(content) ? content : JSON.stringify(content));
  };
  put('production/generate-route-audio.mjs', fs.readFileSync(path.join(root, 'production/generate-route-audio.mjs')));
  put('story/alisha-lost-star.json', { start: 'start', scenes: { start: { choices: [{ next: 'end' }] }, end: { ending: true, choices: [] } } });
  put('production/voice-plan.json', { voices: Object.fromEntries(['en', 'es', 'gu'].map(lang => [lang, { status: 'USER_SELECTED_SAMPLE_APPROVED' }])) });
  put('audio/manifest.json', { recordings: { en: {}, es: {}, gu: {} }, textHashes: { en: {}, es: {}, gu: {} } });
  for (const lang of ['en', 'es', 'gu']) put(`story/locales/${lang}.draft.json`, { lines: { 'start.situation': 'Once upon a time', 'start.choice.0': 'Go', 'start.hint': 'Listen', 'end.situation': 'The end', 'end.hint': 'Done' } });
  put('audio/en/start.situation.mp3', Buffer.alloc(1200));
  const result = run(path.join(fixture, 'production/generate-route-audio.mjs'), ['--ending=end']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Recording text hash missing or changed: en\/start\.situation/);
});

test('a completed route rerun preserves the manifest note without requesting audio', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-recorded-route-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const put = (name, content) => {
    const file = path.join(fixture, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(content) ? content : JSON.stringify(content));
  };
  put('production/generate-route-audio.mjs', fs.readFileSync(path.join(root, 'production/generate-route-audio.mjs')));
  put('story/alisha-lost-star.json', { start: 'start', scenes: { start: { choices: [{ next: 'end' }] }, end: { ending: true, choices: [] } } });
  put('production/voice-plan.json', { voices: Object.fromEntries(['en', 'es', 'gu'].map(lang => [lang, { status: 'USER_SELECTED_SAMPLE_APPROVED' }])) });
  const lines = { 'start.situation': 'Once', 'start.choice.0': 'Go', 'start.hint': 'Listen', 'end.situation': 'Done', 'end.hint': 'Rest' };
  const manifest = { note: 'All recorded; draft review pending.', recordings: {}, textHashes: {}, routes: ['end'] };
  for (const lang of ['en', 'es', 'gu']) {
    put(`story/locales/${lang}.draft.json`, { lines });
    manifest.recordings[lang] = {};
    manifest.textHashes[lang] = {};
    for (const [id, text] of Object.entries(lines)) {
      put(`audio/${lang}/${id}.mp3`, Buffer.alloc(1200));
      manifest.recordings[lang][id] = `../audio/${lang}/${id}.mp3`;
      manifest.textHashes[lang][id] = crypto.createHash('sha256').update(text).digest('hex');
    }
  }
  put('audio/manifest.json', manifest);
  const result = spawnSync(process.execPath, [path.join(fixture, 'production/generate-route-audio.mjs'), '--ending=end', '--generate'], {
    cwd: os.tmpdir(), encoding: 'utf8', env: { ...process.env, ELEVENLABS_API_KEY: 'test-only-no-requests' }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture, 'audio/manifest.json'))).note, manifest.note);
});
