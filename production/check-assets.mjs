import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const register = JSON.parse(fs.readFileSync(path.join(root, 'production/temporary-assets.json'), 'utf8'));
const ids = new Set();
for (const item of register.items) {
  if (ids.has(item.id)) throw new Error(`Duplicate asset ID: ${item.id}`);
  ids.add(item.id);
  if (!['TEMPORARY', 'FINAL_CANDIDATE', 'APPROVED'].includes(item.status)) throw new Error(`Invalid status: ${item.id}`);
  if (!fs.existsSync(path.join(root, item.file))) throw new Error(`Missing registered file: ${item.file}`);
}
const temporary = register.items.filter(item => item.status === 'TEMPORARY');
console.log(`${temporary.length} temporary items remain: ${temporary.map(item => item.id).join(', ') || 'none'}`);
if (process.argv.includes('--final') && temporary.length) process.exitCode = 1;
