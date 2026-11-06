import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function glb(mimeType) {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, images: [{ mimeType }] }));
  const length = Math.ceil(json.length / 4) * 4;
  const out = Buffer.alloc(20 + length, 0x20);
  out.write('glTF', 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  json.copy(out, 20);
  return out;
}

test('validator rejects an output that kept PNG instead of WebP', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cyoa-model-'));
  try {
    const source = join(dir, 'source.glb'), prepared = join(dir, 'prepared.glb');
    writeFileSync(source, glb('image/png'));
    writeFileSync(prepared, glb('image/png'));
    const command = fileURLToPath(new URL('./validate.mjs', import.meta.url));
    const failed = spawnSync(process.execPath, [command, source, prepared], { encoding: 'utf8' });
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).checks.imageCompression, false);
    writeFileSync(prepared, glb('image/webp'));
    const passed = spawnSync(process.execPath, [command, source, prepared], { encoding: 'utf8' });
    assert.equal(passed.status, 0, passed.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
