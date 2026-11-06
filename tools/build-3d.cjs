const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const dependencyFolder = process.env.NODE_PATH || path.join(root, 'node_modules');
const verify = process.argv.includes('--verify');
const temporary = verify ? fs.mkdtempSync(path.join(os.tmpdir(), 'alisha-3d-verify-')) : null;
const bundles = [
  ['v2/shared-stage/shared-stage.source.js', 'v2/shared-stage/shared-stage.mjs', 'esnext'],
  ['v2/star-3d/star-stage-source.js', 'v2/star-3d/star-stage.mjs', 'chrome90'],
  ['v2/adventure-3d/adventure-stage-source.js', 'v2/adventure-3d/adventure-stage.mjs', 'chrome90'],
];

try {
  for (const [source, output, target] of bundles) {
    const destination = verify ? path.join(temporary, path.basename(output)) : path.join(root, output);
    esbuild.buildSync({
      entryPoints: [path.join(root, source)], outfile: destination,
      bundle: true, format: 'esm', platform: 'browser', target, minify: true,
      nodePaths: [dependencyFolder],
    });
    if (verify && !fs.readFileSync(destination).equals(fs.readFileSync(path.join(root, output)))) {
      throw new Error(`Bundle differs from its checked-in source: ${output}`);
    }
    console.log(`${verify ? 'Verified' : 'Built'} ${output}`);
  }
} finally {
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
