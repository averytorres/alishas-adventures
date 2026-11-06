import fs from 'node:fs';
import crypto from 'node:crypto';

function inspect(path) {
  const b = fs.readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'glTF' || b.readUInt32LE(4) !== 2 || b.readUInt32LE(8) !== b.length) throw Error(`Invalid GLB: ${path}`);
  const n = b.readUInt32LE(12), type = b.readUInt32LE(16);
  if (type !== 0x4e4f534a) throw Error(`Missing JSON chunk: ${path}`);
  const g = JSON.parse(b.toString('utf8', 20, 20 + n));
  const clipInfo = (g.animations || []).map(a => ({name:a.name || 'unnamed', channels:a.channels?.length || 0}));
  const clips = clipInfo.map(a => a.name);
  let triangles = 0;
  for (const m of g.meshes || []) for (const p of m.primitives || []) {
    if ((p.mode ?? 4) === 4) triangles += Math.floor(g.accessors[p.indices ?? p.attributes.POSITION].count / 3);
  }
  return {path, bytes:b.length, sha256:crypto.createHash('sha256').update(b).digest('hex'), clips, clipInfo,
    triangles, meshes:g.meshes?.length || 0, skins:g.skins?.length || 0,
    images:(g.images || []).map(i => i.mimeType || i.uri || 'unknown'),
    extensionsUsed:g.extensionsUsed || [], extensionsRequired:g.extensionsRequired || []};
}
if (process.argv.length < 4) throw Error('usage: node validate.mjs SOURCE.glb PREPARED.glb [report.json]');
const source = inspect(process.argv[2]), prepared = inspect(process.argv[3]);
const missing = source.clips.filter(x => !prepared.clips.includes(x));
const empty = prepared.clipInfo.filter(x => x.channels === 0).map(x => x.name);
const report = {source, prepared, checks:{allClipsRetained:missing.length===0, missingClips:missing, emptyClips:empty,
  skinRetained:source.skins===0 || prepared.skins>0,
  trianglesRetained:prepared.triangles===source.triangles,
  imageCompression:prepared.images.every(x => x==='image/webp')},
  sizeReductionPercent:Math.round((1-prepared.bytes/source.bytes)*1000)/10};
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (!report.checks.allClipsRetained || empty.length || !report.checks.skinRetained ||
    !report.checks.trianglesRetained || !report.checks.imageCompression) process.exitCode=1;
