import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Read-only by default. Generation and alignment are deliberately separate runs.
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const languages = ['en', 'es', 'gu'];
const reserve = 20_000;
const batchCharacters = 2_000;
// Subscription character accounting can differ by model. Budget two credits per
// input character, then recheck the live balance before every bounded batch.
const budgetPerCharacter = 2;
const manifestPath = path.join(root, 'audio/cloud-manifest.json');
const timingsPath = path.join(root, 'audio/cloud-word-timings.json');

function options(argv) {
  const result = { mode: 'estimate', keyFile: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (['--estimate', '--generate', '--align'].includes(arg)) {
      if (result.explicitMode) throw new Error('Choose exactly one of --estimate, --generate, --align');
      result.mode = arg.slice(2);
      result.explicitMode = true;
    } else if (arg === '--key-file') {
      result.keyFile = argv[++i];
      if (!result.keyFile || result.keyFile.startsWith('--')) throw new Error('--key-file needs a path');
    } else if (arg.startsWith('--key-file=')) {
      result.keyFile = arg.slice('--key-file='.length);
      if (!result.keyFile) throw new Error('--key-file needs a path');
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return result;
}

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function saveJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function mp3Valid(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 1_000) return false;
  const bytes = Buffer.alloc(3);
  const fd = fs.openSync(file, 'r');
  try { fs.readSync(fd, bytes, 0, 3, 0); } finally { fs.closeSync(fd); }
  return bytes.toString('latin1') === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
}

function validWords(words, text) {
  return Array.isArray(words) && words.length === (text.match(/\S+/gu) ?? []).length &&
    words.every(([start, end], index) => Number.isFinite(start) && Number.isFinite(end) &&
      start >= 0 && end > start && (index === 0 || start >= words[index - 1][1]));
}

function wordsFromAlignment(result, text) {
  const count = (text.match(/\S+/gu) ?? []).length;
  if (Array.isArray(result.characters) && result.characters.map(item => item.text).join('') === text) {
    const groups = [];
    let group = [];
    for (const character of result.characters) {
      if (/^\s+$/u.test(character.text)) {
        if (group.length) groups.push(group);
        group = [];
      } else group.push(character);
    }
    if (group.length) groups.push(group);
    if (groups.length === count) return groups.map(items => [items[0].start, items.at(-1).end]);
  }
  if (Array.isArray(result.words) && result.words.length === count) {
    return result.words.map(item => [item.start, item.end]);
  }
  throw new Error('Aligned word count or text differs from the story');
}

async function request(url, init, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try { response = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) }); }
    catch (error) {
      if (attempt === 3) throw new Error(`${label}: network request failed (${error.name})`);
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      continue;
    }
    if (response.ok) return response;
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) {
      // Do not print response bodies: a provider error might reflect credentials.
      throw new Error(`${label}: HTTP ${response.status}`);
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 1500));
  }
}

const args = options(process.argv.slice(2));
const story = readJson(path.join(root, 'story/alisha-cloud-wouldnt-rain.json'));
const voicePlan = readJson(path.join(root, 'production/voice-plan.json'));
const manifest = readJson(manifestPath, { schemaVersion: 1, status: 'DRAFT_TEMPORARY', recordings: {}, textHashes: {} });
const timings = readJson(timingsPath, { schemaVersion: 1, status: 'DRAFT_ALIGNED_PENDING_REVIEW', timings: {} });
if (!story?.scenes || !manifest.recordings || !manifest.textHashes || !timings.timings) throw new Error('Invalid story or audio metadata');

const ids = [`${story.id}.description`, ...Object.entries(story.scenes).flatMap(([scene, data]) => [
  `${scene}.situation`,
  ...(data.choices ?? []).map((_, index) => `${scene}.choice.${index}`),
  `${scene}.hint`,
])];
const work = [];
for (const lang of languages) {
  const voice = voicePlan.voices?.[lang];
  if (voice?.status !== 'USER_SELECTED_SAMPLE_APPROVED' || !voice.voiceId || !voice.modelId) {
    throw new Error(`Approved voice missing: ${lang}`);
  }
  const lines = readJson(path.join(root, `story/locales/cloud.${lang}.json`))?.lines;
  if (!lines) throw new Error(`Locale missing: ${lang}`);
  for (const id of ids) {
    const text = lines[id];
    if (typeof text !== 'string' || !text.trim()) throw new Error(`Missing text: ${lang}/${id}`);
    const textHash = hash(text);
    const file = path.join(root, 'audio', lang, `cloud_${id}.mp3`);
    const exists = fs.existsSync(file);
    if (exists && (!mp3Valid(file) || manifest.textHashes[lang]?.[id] !== textHash ||
      manifest.recordings[lang]?.[id] !== `../audio/${lang}/cloud_${id}.mp3`)) {
      throw new Error(`Recording invalid or text hash missing/changed: ${lang}/${id}`);
    }
    work.push({ lang, id, text, textHash, file, voice, exists });
  }
}
const pending = work.filter(item => !item.exists);
const awaitingAlignment = work.filter(item => item.id.endsWith('.situation') && item.exists &&
  !(timings.timings[item.lang]?.[item.id]?.text === item.text &&
    (validWords(timings.timings[item.lang][item.id].words, item.text) ||
      (item.lang === 'gu' && timings.timings[item.lang][item.id].fallback === 'NO_WORD_HIGHLIGHT'))));
const estimate = {
  mode: args.mode, scenes: Object.keys(story.scenes).length, linesPerLanguage: ids.length,
  missingRecordings: pending.length,
  newCharacters: pending.reduce((sum, item) => sum + item.text.length, 0),
  conservativeCreditBudget: pending.reduce((sum, item) => sum + item.text.length * budgetPerCharacter, 0),
  requiredReserve: reserve,
  situationRecordingsAwaitingAlignment: awaitingAlignment.length,
  perLanguage: Object.fromEntries(languages.map(lang => [lang, {
    missing: pending.filter(item => item.lang === lang).length,
    characters: pending.filter(item => item.lang === lang).reduce((sum, item) => sum + item.text.length, 0),
  }])),
};
console.log(JSON.stringify(estimate, null, 2));
if (args.mode === 'estimate') process.exit(0);
if (args.mode === 'align' && awaitingAlignment.length === 0) process.exit(0);
if (args.mode === 'generate' && pending.length === 0) process.exit(0);

const key = (args.keyFile ? fs.readFileSync(args.keyFile, 'utf8') : process.env.ELEVENLABS_API_KEY ?? '').trim();
if (!key) throw new Error('ElevenLabs API key missing; use --key-file or ELEVENLABS_API_KEY');
const headers = { 'xi-api-key': key };
// Both files are required by the player, even before the first alignment run.
if (!fs.existsSync(manifestPath)) saveJson(manifestPath, manifest);
if (!fs.existsSync(timingsPath)) saveJson(timingsPath, timings);

if (args.mode === 'generate') {
  let index = 0;
  while (index < pending.length) {
    const batch = [];
    let characters = 0;
    while (index < pending.length && (batch.length === 0 || characters + pending[index].text.length <= batchCharacters)) {
      batch.push(pending[index++]);
      characters += batch.at(-1).text.length;
    }
    const response = await request('https://api.elevenlabs.io/v1/user/subscription', { headers }, 'Subscription balance');
    const subscription = await response.json();
    const limit = subscription.character_limit, used = subscription.character_count;
    if (!Number.isFinite(limit) || !Number.isFinite(used) || used < 0 || limit < used) {
      throw new Error('Subscription balance unavailable or invalid');
    }
    const remaining = limit - used;
    const budget = characters * budgetPerCharacter;
    if (remaining - budget < reserve) {
      throw new Error(`Insufficient credits for next batch: ${remaining} available, ${budget} budgeted, ${reserve} reserved`);
    }
    console.log(`Batch ${batch.length} lines, ${characters} characters; balance ${remaining}, budget ${budget}, reserve ${reserve}`);
    for (const item of batch) {
      const response = await request(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(item.voice.voiceId)}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text, model_id: item.voice.modelId }),
      }, `${item.lang}/${item.id} generation`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1_000 || !(bytes.toString('latin1', 0, 3) === 'ID3' ||
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))) throw new Error(`Invalid MP3: ${item.lang}/${item.id}`);
      fs.mkdirSync(path.dirname(item.file), { recursive: true });
      fs.writeFileSync(`${item.file}.tmp`, bytes);
      manifest.recordings[item.lang] ??= {};
      manifest.textHashes[item.lang] ??= {};
      manifest.recordings[item.lang][item.id] = `../audio/${item.lang}/cloud_${item.id}.mp3`;
      manifest.textHashes[item.lang][item.id] = item.textHash;
      // Persist the hash first: a crash before MP3 rename leaves a missing file
      // that can safely be generated again on the next run.
      saveJson(manifestPath, manifest);
      fs.renameSync(`${item.file}.tmp`, item.file);
      console.log(`Recorded ${item.lang}/${item.id}`);
    }
  }
  console.log(`Generation complete: ${pending.length} recordings`);
} else {
  for (const item of awaitingAlignment) {
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(item.file)], { type: 'audio/mpeg' }), path.basename(item.file));
    form.append('text', item.text);
    const response = await request('https://api.elevenlabs.io/v1/forced-alignment', {
      method: 'POST', headers, body: form,
    }, `${item.lang}/${item.id} alignment`);
    const result = await response.json();
    let entry;
    try {
      const words = wordsFromAlignment(result, item.text).map(([start, end]) => [
        Math.round(start * 1000) / 1000, Math.round(end * 1000) / 1000,
      ]);
      if (!validWords(words, item.text)) throw new Error('Invalid or zero-duration word timings');
      entry = { text: item.text, words };
    } catch (error) {
      if (item.lang !== 'gu') throw new Error(`${item.lang}/${item.id}: ${error.message}`);
      // The player falls back to whole-line narration when words is empty.
      entry = { text: item.text, words: [], fallback: 'NO_WORD_HIGHLIGHT', reason: error.message };
      console.warn(`${item.lang}/${item.id}: alignment invalid; saved explicit whole-line fallback`);
    }
    timings.timings[item.lang] ??= {};
    timings.timings[item.lang][item.id] = entry;
    saveJson(timingsPath, timings);
    console.log(`Aligned ${item.lang}/${item.id}`);
  }
  console.log(`Alignment complete: ${awaitingAlignment.length} situations`);
}
