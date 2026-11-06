import crypto from 'node:crypto';
import fs from 'node:fs';

const folder = process.argv[2];
const output = process.argv[3];
if (!folder || !output) throw new Error('Usage: node prepare-voice-samples.mjs story/locales output.json');

const ids = ['alisha-lost-star.description', 'castle_gate.situation', 'castle_gate.choice.0'];
const samples = [];
for (const language of ['en', 'es', 'gu']) {
  const locale = JSON.parse(fs.readFileSync(`${folder}/${language}.draft.json`, 'utf8'));
  for (const id of ids) {
    const text = locale.lines[id];
    if (!text) throw new Error(`Missing ${language}/${id}`);
    samples.push({
      language,
      lineId: id,
      text,
      textSha256: crypto.createHash('sha256').update(text).digest('hex'),
      characters: text.length,
      voiceId: null,
      modelId: null,
      status: 'NOT_GENERATED',
    });
  }
}
const plan = {
  schemaVersion: 1,
  purpose: 'Review one woman narrator per language before full generation',
  pronunciation: { Alisha: 'ah-LEE-sha' },
  samples,
};
fs.writeFileSync(output, JSON.stringify(plan, null, 2) + '\n');
const characters = samples.reduce((sum, sample) => sum + sample.characters, 0);
console.log(`Prepared ${samples.length} samples, ${characters} draft characters; spent 0 credits.`);
