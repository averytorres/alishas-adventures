import fs from 'node:fs';
const folder = process.argv[2], balance = Number(process.argv[3]);
if (!folder || !Number.isFinite(balance)) throw new Error('Usage: node count-locales.mjs story/locales availableCredits');
const counts = Object.fromEntries(['en','es','gu'].map(code => {
  const locale = JSON.parse(fs.readFileSync(`${folder}/${code}.draft.json`, 'utf8'));
  const ui = JSON.parse(fs.readFileSync(`${folder}/ui.${code}.draft.json`, 'utf8'));
  return [code, [...Object.values(locale.lines), ...Object.values(ui.lines)].reduce((n, line) => n + line.length, 0)];
}));
const base = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ draftCharacters: counts, totalDraftCharacters: base, availableCredits: balance, planningBalanceAtOneCreditPerCharacter: balance - base, exclusions: ['retakes', 'model-specific pricing', 'translation revisions'], status: 'PLANNING_ONLY_NO_CREDITS_SPENT' }, null, 2));
