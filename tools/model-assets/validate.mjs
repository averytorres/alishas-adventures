import fs from 'node:fs';
import crypto from 'node:crypto';

function inspect(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.toString('ascii', 0, 4) !== 'glTF' ||
      bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw Error(`Invalid GLB: ${file}`);
  }
  const jsonLength = bytes.readUInt32LE(12);
  const chunkType = bytes.readUInt32LE(16);
  if (chunkType !== 0x4e4f534a) throw Error(`Missing JSON chunk: ${file}`);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const clipInfo = (gltf.animations || []).map(animation => ({
    name: animation.name || 'unnamed',
    channels: animation.channels?.length || 0,
  }));
  const clips = clipInfo.map(animation => animation.name);
  let triangles = 0;
  for (const mesh of gltf.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      if ((primitive.mode ?? 4) === 4) {
        triangles += Math.floor(gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3);
      }
    }
  }
  return {
    path: file,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    clips, clipInfo, triangles,
    meshes: gltf.meshes?.length || 0,
    skins: gltf.skins?.length || 0,
    images: (gltf.images || []).map(image => image.mimeType || image.uri || 'unknown'),
    extensionsUsed: gltf.extensionsUsed || [],
    extensionsRequired: gltf.extensionsRequired || [],
  };
}

if (process.argv.length < 4) throw Error('usage: node validate.mjs SOURCE.glb PREPARED.glb [report.json]');
const source = inspect(process.argv[2]);
const prepared = inspect(process.argv[3]);
const missing = source.clips.filter(clip => !prepared.clips.includes(clip));
const empty = prepared.clipInfo.filter(clip => clip.channels === 0).map(clip => clip.name);
const report = {
  source, prepared,
  checks: {
    allClipsRetained: missing.length === 0,
    missingClips: missing,
    emptyClips: empty,
    skinRetained: source.skins === 0 || prepared.skins > 0,
    trianglesRetained: prepared.triangles === source.triangles,
    imageCompression: prepared.images.every(image => image === 'image/webp'),
  },
  sizeReductionPercent: Math.round((1 - prepared.bytes / source.bytes) * 1000) / 10,
};
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.checks.allClipsRetained || empty.length || !report.checks.skinRetained ||
    !report.checks.trianglesRetained || !report.checks.imageCompression) {
  process.exitCode = 1;
}
