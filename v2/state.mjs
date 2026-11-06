import { createSession } from '../engine/story.mjs';

export const STORAGE_KEY = 'cyoa-v2-preview';
export const LANGUAGES = ['en', 'es', 'gu'];
export const PRINCESSES = ['adventure', 'star'];

export function browserStorage(browserWindow) {
  try { return browserWindow.localStorage; }
  catch { return null; }
}

export function readSavedState(storage, key = STORAGE_KEY) {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    // A damaged or inaccessible save must not prevent the story library opening.
    return null;
  }
}

export function writeSavedState(storage, value, key = STORAGE_KEY) {
  try { storage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function normalizeState(value, stories) {
  const progress = {};
  for (const story of stories) {
    const scene = value?.progress?.[story.id];
    if (typeof scene === 'string' && story.scenes[scene]) progress[story.id] = scene;
  }
  return {
    language: LANGUAGES.includes(value?.language) ? value.language : 'en',
    princess: PRINCESSES.includes(value?.princess) ? value.princess : 'adventure',
    progress
  };
}

export function startOrResume(story, progress, restart = false) {
  return createSession(story, restart ? story.start : progress?.[story.id] || story.start);
}

export function advance(session, index, story, progress) {
  const result = session.choose(index);
  if (result.action === 'scene') progress[story.id] = result.id;
  return result;
}

export function makeSpeechCooldown(action, delay = 1500, now = () => performance.now()) {
  let lastStart = -Infinity;
  return (...args) => {
    const current = now();
    if (current - lastStart < delay) return;
    lastStart = current;
    return action(...args);
  };
}

export const narrationStatus = {
  en: { ready: 'Recorded narration is ready on this screen.', playing: 'Playing recorded narration' },
  es: { ready: 'La narración grabada está lista en esta pantalla.', playing: 'Reproduciendo la narración grabada' },
  gu: { ready: 'આ પાનાનું રેકોર્ડ કરેલું વાચન તૈયાર છે.', playing: 'રેકોર્ડ કરેલું વાચન ચાલી રહ્યું છે' }
};

export function narrationCoverageMessage(recordings, ids, language = 'en') {
  const missing = ids.filter(id => !recordings?.[id]).length;
  return missing
    ? `${missing} spoken line${missing === 1 ? '' : 's'} on this screen still need${missing === 1 ? 's' : ''} recording${missing === 1 ? '' : 's'}.`
    : (narrationStatus[language] || narrationStatus.en).ready;
}

export function choiceScrollDelta(rect, stageBottom, viewportHeight) {
  const safeTop = Math.max(90, stageBottom + 14);
  const safeBottom = viewportHeight - 18;
  return rect.top < safeTop ? rect.top - safeTop : rect.bottom > safeBottom ? rect.bottom - safeBottom : 0;
}

export function makeHoldHandler({ onHold, onTap, delay = 550 }) {
  let timer = null, held = false, canceled = false, tracking = false, pointerId = null, startX = 0, startY = 0;
  const clear = () => { if (timer) clearTimeout(timer); timer = null; };
  const samePointer = event => pointerId === null || event.pointerId === undefined || event.pointerId === pointerId;
  return {
    pointerdown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.isPrimary === false || tracking) { tracking = false; canceled = true; clear(); return; }
      clear(); held = false; canceled = false; tracking = true; pointerId = event.pointerId ?? null; startX = event.clientX; startY = event.clientY;
      timer = setTimeout(() => { if (tracking) { held = true; onHold(); } }, delay);
    },
    pointermove(event) {
      if (tracking && samePointer(event) && Math.hypot(event.clientX - startX, event.clientY - startY) > 12) { tracking = false; canceled = true; clear(); }
    },
    pointerup(event) { if (samePointer(event)) { tracking = false; pointerId = null; clear(); } },
    pointercancel(event) { if (samePointer(event)) { tracking = false; pointerId = null; clear(); canceled = true; } },
    click(event) {
      if (event.detail === 0) { held = false; canceled = false; onTap(); return; }
      if (held || canceled) { event.preventDefault(); event.stopPropagation(); held = false; canceled = false; } else onTap();
    },
    contextmenu(event) { event.preventDefault(); }
  };
}
