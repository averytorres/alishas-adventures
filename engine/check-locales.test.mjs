import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('locale check catches English source drift and wrong UI language tags', t => {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-locales-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture, 'story'));
  fs.copyFileSync(path.join(root, 'story/alisha-lost-star.json'), path.join(fixture, 'story/alisha-lost-star.json'));
  fs.cpSync(path.join(root, 'story/locales'), path.join(fixture, 'story/locales'), { recursive: true });
  const check = () => spawnSync(process.execPath, [path.join(root, 'engine/check-locales.mjs'), path.join(fixture, 'story/locales')], { encoding: 'utf8' });
  assert.equal(check().status, 0);

  const englishPath = path.join(fixture, 'story/locales/en.draft.json');
  const english = JSON.parse(fs.readFileSync(englishPath));
  english.lines['castle_gate.situation'] += ' Changed.';
  fs.writeFileSync(englishPath, JSON.stringify(english));
  const drift = check();
  assert.equal(drift.status, 1);
  assert.match(drift.stderr, /en: differs from story source: castle_gate\.situation/);

  const uiPath = path.join(fixture, 'story/locales/ui.es.draft.json');
  const ui = JSON.parse(fs.readFileSync(uiPath));
  ui.language = 'en';
  fs.writeFileSync(uiPath, JSON.stringify(ui));
  const wrongTag = check();
  assert.equal(wrongTag.status, 1);
  assert.match(wrongTag.stderr, /es: incorrect UI language tag/);
});
