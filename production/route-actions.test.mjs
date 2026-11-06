import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('both route scripts skip home/restart actions before a deeper ending', t => {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-routes-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const put = (name, content) => {
    const file = path.join(fixture, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(content) ? content : JSON.stringify(content));
  };
  for (const name of ['check-route.mjs', 'generate-route-audio.mjs']) put(`production/${name}`, fs.readFileSync(path.join(root, 'production', name)));
  const scenes = {
    start: { choices: [{ next: 'early' }, { next: 'middle' }] },
    early: { ending: true, choices: [{ next: '$home' }, { next: '$restart' }] },
    middle: { choices: [{ next: 'target' }] },
    target: { ending: true, choices: [{ next: '$home' }, { next: '$restart' }] }
  };
  put('story/alisha-lost-star.json', { start: 'start', scenes });
  put('story/scene-art.draft.json', { scenes: Object.fromEntries(Object.keys(scenes).map(id => [id, { background: 'a.png', dragon: 'd.png' }])) });
  put('production/voice-plan.json', { voices: Object.fromEntries(['en', 'es', 'gu'].map(lang => [lang, { status: 'USER_SELECTED_SAMPLE_APPROVED' }])) });
  put('v2/a.png', Buffer.from('a'));
  put('v2/d.png', Buffer.from('d'));
  const manifest = { recordings: {}, textHashes: {} };
  for (const lang of ['en', 'es', 'gu']) {
    const lines = {};
    manifest.recordings[lang] = {};
    manifest.textHashes[lang] = {};
    for (const [id, scene] of Object.entries(scenes)) {
      for (const lineId of [`${id}.situation`, `${id}.hint`, ...scene.choices.map((_, index) => `${id}.choice.${index}`)]) {
        const text = `${lang} ${lineId}`;
        lines[lineId] = text;
        manifest.recordings[lang][lineId] = `../audio/${lang}/${lineId}.mp3`;
        manifest.textHashes[lang][lineId] = crypto.createHash('sha256').update(text).digest('hex');
        put(`audio/${lang}/${lineId}.mp3`, Buffer.concat([Buffer.from('ID3'), Buffer.alloc(1200)]));
      }
    }
    put(`story/locales/${lang}.draft.json`, { lines });
  }
  put('audio/manifest.json', manifest);
  const run = name => spawnSync(process.execPath, [path.join(fixture, 'production', name), '--ending=target'], { encoding: 'utf8' });
  const checked = run('check-route.mjs');
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /Checked 3 illustrated scenes/);
  const estimate = run('generate-route-audio.mjs');
  assert.equal(estimate.status, 0, estimate.stderr);
  assert.deepEqual(JSON.parse(estimate.stdout).route, ['start', 'middle', 'target']);
});
