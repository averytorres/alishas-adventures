import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('review renderer does not claim narration is absent', t => {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-review-')), 'review.md');
  t.after(() => fs.rmSync(path.dirname(output), { recursive: true, force: true }));
  const run = spawnSync(process.execPath, [
    path.join(root, 'engine/render-story.mjs'),
    path.join(root, 'story/alisha-lost-star.json'), output,
    path.join(root, 'story/locales/es.draft.json')
  ], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const rendered = fs.readFileSync(output, 'utf8');
  assert.match(rendered, /Narration status is tracked in audio\/manifest\.json/);
  assert.doesNotMatch(rendered, /No voices have been generated/);
});
