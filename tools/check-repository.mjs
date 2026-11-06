import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const ignoredDirectories = new Set(['.git', '.secrets', 'node_modules', '__pycache__', '.venv']);
const ignoredPrefixes = ['android/build/', 'animation-pilot/star-princess/build/', 'animation-pilot/storybook-3d/meshy-preview/'];
const ignoredExtensions = new Set(['.apk', '.idsig', '.aab', '.zip']);
const textExtensions = new Set(['.md', '.json', '.mjs', '.cjs', '.js', '.html', '.css', '.ps1', '.py', '.java', '.xml', '.yaml', '.rml', '.txt', '.sh', '.cmd', '.bat', '.gitignore', '.gitattributes']);
const problems = [];
let scanned = 0;

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name) && !ignoredPrefixes.some(prefix => `${relative}/`.startsWith(prefix))) visit(absolute);
      continue;
    }
    if (!entry.isFile() || relative === 'android/debug.keystore' || relative === 'audio/generation-ledger.draft.json') continue;
    const extension = entry.name.startsWith('.') ? entry.name.toLowerCase() : path.extname(entry.name).toLowerCase();
    if (ignoredExtensions.has(extension)) continue;
    if (/(?:^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:keystore|jks|p12|pfx|pem|key))$/i.test(relative)) continue;
    if (!textExtensions.has(extension)) continue;
    scanned++;
    const content = fs.readFileSync(absolute, 'utf8');
    const checks = [
      ['machine-specific home path', /(?:[A-Z]:[\\/]Users[\\/]|\/[Uu]sers\/|\/home\/)[^\s"'`]+/g],
      ['private key', /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g],
      ['possible personal email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
      ['possible API key', /\b(?:sk_[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,})\b/g],
    ];
    for (const [label, pattern] of checks) {
      const match = pattern.exec(content);
      if (match) problems.push(`${relative}:${content.slice(0, match.index).split('\n').length}: ${label}`);
    }
  }
}

visit(root);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Repository hygiene check passed: ${scanned} text files scanned.`);
}
