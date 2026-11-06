import { localizeStory } from '../engine/localize-story.mjs';
import { narrationSequence } from '../engine/story.mjs';
import {
  browserStorage, normalizeState, readSavedState, writeSavedState,
  startOrResume, advance, makeHoldHandler, makeSpeechCooldown,
  narrationCoverageMessage, narrationStatus, choiceScrollDelta
} from './state.mjs';
import { createNarrator } from './narration.mjs';
import { wordParts, timedWordsFor } from './word-highlighting.mjs';
import { SharedStage } from './shared-stage/shared-stage.mjs';
import { createSceneTransition } from './transition-effects.mjs';
import { loadContent } from './content.mjs';

const root = document.querySelector('#app');
const overlay = document.querySelector('#overlay-root');
const portrait = {
  adventure: { src: '../assets/princess-adventure.png', name: 'Adventurer' },
  star: { src: '../assets/princess-star.png', name: 'Star Princess' }
};
let baseStories = [];
let story, ui, state, session, narrator;
let screen = 'library';
let audioManifest = {}, wordTimings = {};
let sceneArt = {}, libraryCovers = {}, bodyMotion = {};
let localeContent = {}, uiContent = {};
const sharedStage = new SharedStage({
  princessUrls: { star: './star-3d/model.glb', adventure: './adventure-3d/model.glb' },
  dragonUrl: './dragon-3d/context-actions.glb',
  onError: (...args) => console.error(...args)
});
// The story content, rather than the presence of a generic art record, controls the actor.
function dragonInScene(id) {
  const scene = baseStories.find(item => item.id === story?.id)?.scenes?.[id];
  return Boolean(scene && /\bdragon\b/i.test(scene.situation));
}
let openingStory = false;
let changingScene = false;
let sceneReady = Promise.resolve();
const transitionKinds = ['sparkle', 'star', 'cloud'];

function transitionForRoute(storyId, from, choiceIndex, destination) {
  const route = `${storyId}:${from}:${choiceIndex}:${destination}`;
  let hash = 0;
  for (const character of route) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  return transitionKinds[(hash >>> 0) % transitionKinds.length];
}

function motionDelay(milliseconds) {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? Promise.resolve()
    : new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

let gateAnswer = null;
let saveFailed = false;
const princessLoadText = {
  en: { loading: 'Alisha is arriving', failed: 'Alisha could not load', retry: 'Try again', back: 'Back to stories' },
  es: { loading: 'Alisha está llegando', failed: 'No se pudo cargar a Alisha', retry: 'Intentar de nuevo', back: 'Volver a las historias' },
  gu: { loading: 'આલીશા આવી રહી છે', failed: 'આલીશા લોડ થઈ શકી નથી', retry: 'ફરી પ્રયાસ કરો', back: 'વાર્તાઓ પર પાછા જાઓ' }
};
const saveWarning = {
  en: 'Progress cannot be saved on this device right now.',
  es: 'Ahora mismo no se puede guardar el progreso en este dispositivo.',
  gu: 'હમણાં આ ઉપકરણમાં તમારી પ્રગતિ સાચવી શકાતી નથી.'
};
const extraUi = {
  en: {
    brand: 'Alisha’s Adventures',
    choose: 'Choose an adventure',
    picture: 'Princess Alisha portrait',
    open: 'Open story; hold to hear about it',
    repeatSituation: 'Hear the situation again'
  },
  es: {
    brand: 'Las aventuras de Alisha',
    choose: 'Elige una aventura',
    picture: 'Retrato de la princesa Alisha',
    open: 'Abrir la historia; mantener pulsado para escuchar de qué trata',
    repeatSituation: 'Escuchar solo la situación'
  },
  gu: {
    brand: 'આલીશાની સાહસકથાઓ',
    choose: 'એક સાહસકથા પસંદ કરો',
    picture: 'રાજકુમારી આલીશાનું ચિત્ર',
    open: 'વાર્તા ખોલો; તે વિશે સાંભળવા દબાવી રાખો',
    repeatSituation: 'આ વાર્તાનો ભાગ ફરી સાંભળો'
  }
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function button(label, action, className = '') {
  const element = node('button', className, label);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}
const speechCooldown = makeSpeechCooldown;
function image(princess, label) {
  const portraitImage = node('img', 'portrait');
  portraitImage.src = portrait[princess].src;
  portraitImage.alt = label || `Portrait of ${portrait[princess].name}`;
  return portraitImage;
}
function save() {
  saveFailed = !writeSavedState(browserStorage(window), state);
}
function linesForScene(id, current) {
  const situation = { id: `${id}.situation`, text: current.situation };
  const choices = current.choices.map((choice, index) => ({
    id: `${id}.choice.${index}`,
    text: choice.text
  }));
  return [situation, ...choices];
}
function announceStatus(message) {
  const status = document.querySelector('#narration-status');
  if (!status) return;
  const routine = Object.values(narrationStatus).some(value => message === value.ready || message === value.playing);
  const warning = saveFailed ? saveWarning[state.language] : '';
  const visible = [status.dataset.coverageError, warning, routine ? '' : message].filter(Boolean);
  status.textContent = visible.join(' ');
  status.hidden = visible.length === 0;
}
function highlight(index, line) {
  const situationBox = document.querySelector('.situation');
  if (situationBox) {
    if (line?.id === situationBox.dataset.lineId) {
      situationBox.hidden = false;
      situationBox.dataset.wasRead = 'true';
    } else if (situationBox.dataset.wasRead === 'true') situationBox.hidden = true;
  }
  let active = null;
  document.querySelectorAll('[data-line-id]').forEach(el => {
    const isActive = Boolean(line && el.dataset.lineId === line.id);
    el.classList.toggle('reading', isActive);
    if (isActive) active = el;
  });
  document.querySelector('.stage')?.classList.toggle('narrating', Number.isInteger(index));
  if (line?.id?.endsWith('.situation')) sharedStage.setNarrationProgress(0);
  sharedStage.setTalking(screen === 'reader' && Number.isInteger(index));
  if (active && active !== situationBox) {
    const target = active.closest('.choice-row') || active;
    const rect = target.getBoundingClientRect();
    const stageBottom = document.querySelector('.stage')?.getBoundingClientRect().bottom || 0;
    const delta = choiceScrollDelta(rect, stageBottom, window.innerHeight);
    if (delta) window.scrollBy({ top: delta, behavior: 'auto' });
  }
}
function highlightWord(position) {
  const situation = document.querySelector('.situation[data-word-timing-id]');
  if (!situation) return;
  const active = position?.id === situation.dataset.wordTimingId ? position.index : null;
  let spokenWord = null;
  situation.querySelectorAll('[data-word-index]').forEach(el => {
    const isActive = active !== null && Number(el.dataset.wordIndex) === active;
    el.classList.toggle('spoken-word-active', isActive);
    if (isActive) spokenWord = el;
  });
  if (spokenWord) {
    const wordCount = situation.querySelectorAll('[data-word-index]').length;
    sharedStage.setNarrationProgress(active / Math.max(1, wordCount - 1));
    const wordRect = spokenWord.getBoundingClientRect();
    const boxRect = situation.getBoundingClientRect();
    const wordMiddle = (wordRect.top + wordRect.bottom) / 2;
    const boxMiddle = (boxRect.top + boxRect.bottom) / 2;
    const maxScroll = situation.scrollHeight - situation.clientHeight;
    situation.scrollTop = Math.max(0, Math.min(maxScroll, situation.scrollTop + wordMiddle - boxMiddle));
  }
}
function setNarrator() {
  narrator?.stop();
  narrator = createNarrator({
    language: state.language,
    audioManifest,
    wordTimings,
    onHighlight: highlight,
    onWord: highlightWord,
    onStatus: announceStatus
  });
}
function attachHold(el, onHold, onTap) {
  const handlers = makeHoldHandler({ onHold, onTap });
  for (const [name, handler] of Object.entries(handlers)) el.addEventListener(name, handler);
}
function header(title, showHome = false) {
  const bar = node('header', 'topbar');
  if (showHome) bar.append(button('⌂  ' + ui['player.home'], () => { narrator.stop(); screen = 'library'; render(); }, 'quiet'));
  bar.append(node('strong', 'brand', title));
  return bar;
}
function statusBox(ids) {
  const recordings = audioManifest[state.language] || {};
  const coverage = narrationCoverageMessage(recordings, ids, state.language);
  const el = node('p', 'audio-status');
  el.id = 'narration-status';
  el.setAttribute('role', 'status');
  el.dataset.coverageError = coverage === narrationStatus[state.language].ready ? '' : coverage;
  const warning = saveFailed ? saveWarning[state.language] : '';
  el.textContent = [el.dataset.coverageError, warning].filter(Boolean).join(' ');
  el.hidden = !el.textContent;
  return el;
}
function warmPrincess(key) {
  return sharedStage.preload(key);
}

function createLibraryIntro() {
  const intro = node('section', 'library-intro');
  const introHeading = node('div', 'library-intro-heading');
  introHeading.append(node('h1', '', extraUi[state.language].choose), button('⚙  Parents', openGate, 'quiet'));
  intro.append(introHeading);
  const instruction = { id: 'library.instruction', text: ui['library.instruction'] };
  intro.append(button('🔊  ' + instruction.text, speechCooldown(() => narrator.play([instruction])), 'small-speaker'));
  return intro;
}

function createStoryCard(base) {
  const localized = localizeStory(base, localeContent[state.language]);
  const description = { id: `${base.id}.description`, text: localized.description };
  const card = node('article', 'story-card');
  const art = node('div', 'story-art');
  const coverPath = libraryCovers[base.id]?.[state.princess];

  if (coverPath) {
    const cover = node('img', 'story-cover');
    cover.src = coverPath;
    cover.alt = localized.title;
    cover.loading = 'lazy';
    art.append(cover);
  } else {
    art.append(image(state.princess, extraUi[state.language].picture));
  }

  // The large art action and separate speaker action never share a click target.
  const artAction = button(extraUi[state.language].open, () => {}, 'art-action');
  artAction.setAttribute('aria-label', `${localized.title}. ${extraUi[state.language].open}`);
  attachHold(artAction, speechCooldown(() => narrator.play([description])), () => openStory(base.id));
  art.append(artAction);

  const text = node('div', 'story-card-text');
  text.append(node('h2', '', localized.title), node('p', '', localized.description));

  const savedScene = state.progress[base.id];
  const hasStarted = Boolean(savedScene && savedScene !== base.start);
  const controls = node('div', 'card-actions');
  controls.append(button(hasStarted ? ui['library.resume'] : ui['library.start'], () => openStory(base.id), 'primary'));
  if (hasStarted) {
    controls.append(button('↺  ' + ui['library.restart'], () => openStory(base.id, true), 'quiet restart-story'));
  }
  controls.append(button('🔊  ' + ui['library.storySpeaker'], speechCooldown(() => narrator.play([description])), 'small-speaker'));
  card.append(art, text, controls);
  return card;
}

function preloadLibraryCharacters() {
  if (screen !== 'library') return;
  warmPrincess(state.princess).catch(error => console.error('Princess preload failed:', error));
  sharedStage.preload('dragon').catch(error => console.error('Dragon preload failed:', error));
}

function renderLibrary(announce = true) {
  const descriptionIds = baseStories.map(item => `${item.id}.description`);
  root.replaceChildren(statusBox(['library.instruction', ...descriptionIds]), createLibraryIntro());

  const shelf = node('section', 'story-shelf');
  shelf.setAttribute('aria-label', 'Story library');
  for (const base of baseStories) shelf.append(createStoryCard(base));
  root.append(shelf);

  if (announce) narrator.play([{ id: 'library.instruction', text: ui['library.instruction'] }]);
  // Begin preparing the selected model while the child browses the story card.
  window.setTimeout(preloadLibraryCharacters, 250);
}
async function openStory(id, restart = false) {
  if (openingStory) return;
  openingStory = true;
  root.querySelector('.story-preparing')?.remove();
  const preparing = node('div', 'story-preparing', princessLoadText[state.language].loading);
  preparing.setAttribute('role', 'status');
  let shown = false;
  let loadFailed = false;
  const showAfter = window.setTimeout(() => {
    if (openingStory && screen === 'library') {
      root.append(preparing);
      shown = true;
    }
  }, 180);

  try {
    const base = baseStories.find(item => item.id === id);
    if (!base) throw new Error(`Unknown story: ${id}`);
    const nextStory = localizeStory(base, localeContent[state.language]);
    const nextSession = startOrResume(nextStory, state.progress, restart);

    // Keep the library visible until the characters for the first scene are ready.
    await warmPrincess(state.princess);
    if (/\bdragon\b/i.test(base.scenes[nextSession.id].situation)) {
      await sharedStage.preload('dragon').catch(error => console.error('Dragon preload failed:', error));
    }
    story = nextStory;
    session = nextSession;
    state.progress[id] = session.id;
    save();
    screen = 'reader';
    render();
    window.scrollTo(0, 0);
  } catch (error) {
    console.error('Story could not open:', error);
    loadFailed = true;
    const recovery = node('div', 'story-load-recovery');
    recovery.append(
      node('p', '', princessLoadText[state.language].failed),
      button(princessLoadText[state.language].retry, () => {
        preparing.remove();
        openStory(id, restart);
      }, 'primary'),
      button(princessLoadText[state.language].back, () => preparing.remove(), 'quiet')
    );
    preparing.replaceChildren(recovery);
    preparing.setAttribute('role', 'alert');
    if (!shown) {
      root.append(preparing);
      shown = true;
    }
  } finally {
    window.clearTimeout(showAfter);
    if (shown && !loadFailed) preparing.remove();
    openingStory = false;
  }
}
async function choose(index) {
  if (changingScene) return;
  changingScene = true;
  narrator.stop();
  const from = session.id;
  const destination = session.scene.choices[index].next;
  const transition = createSceneTransition(transitionForRoute(story.id, from, index, destination), princessLoadText[state.language].loading);
  document.body.append(transition.element);
  const waitingTimer = window.setTimeout(() => {
    transition.waiting.hidden = false;
    transition.element.removeAttribute('aria-hidden');
  }, 900);
  try {
    await motionDelay(380);
    transition.fullyCover();
    const result = advance(session, index, story, state.progress);
    save();
    if (result.action === 'home') screen = 'library';
    render(false);
    window.scrollTo(0, 0);
    if (screen === 'reader') await sceneReady;
    window.clearTimeout(waitingTimer);
    transition.waiting.hidden = true;
    transition.element.setAttribute('aria-hidden', 'true');
    await motionDelay(120);
    transition.reveal();
    await motionDelay(540);
    transition.remove();
    if (screen === 'reader') {
      const lines = linesForScene(session.id, session.scene);
      narrator.play(lines).then(played => {
        const stage = document.querySelector('.stage');
        if (played && !narrator.isPlaying() && session.scene.ending && stage?.classList.contains('shared-3d-ready')) {
          sharedStage.celebrate();
        }
      });
    } else {
      narrator.play([{ id: 'library.instruction', text: ui['library.instruction'] }]);
    }
  } finally {
    window.clearTimeout(waitingTimer);
    transition.remove();
    changingScene = false;
  }
}

function addSceneIllustrations(stage, art) {
  if (!art) return;

  stage.classList.add('illustrated-stage');
  stage.style.backgroundImage = `url('${art.background}')`;
  stage.style.backgroundPosition = art.backgroundPosition;

  if (art.character) {
    const character = node('img', 'story-character');
    character.src = art.character;
    character.alt = '';
    character.style.left = art.characterLeft || '10%';
    character.style.bottom = art.characterBottom || '12%';
    stage.append(character);
  }

  for (const actor of art.characters || []) {
    const character = node('img', 'story-character');
    character.src = actor.src;
    character.alt = '';
    character.style.left = actor.left || '10%';
    character.style.bottom = actor.bottom || '12%';
    if (actor.height) character.style.height = actor.height;
    if (actor.maxWidth) character.style.maxWidth = actor.maxWidth;
    if (actor.float) character.classList.add('story-character--float');
    stage.append(character);
  }

  if (art.dragon) {
    const dragon = node('img', 'dragon-study');
    dragon.src = art.dragon;
    dragon.alt = '';
    stage.append(dragon);
  }
}

function createSituationButton(situationText, line) {
  let coolingDown = false;
  const situation = button(situationText, async () => {
    if (coolingDown || narrator.isPlaying()) return;
    coolingDown = true;
    situation.disabled = true;
    try {
      await narrator.play([line]);
    } finally {
      window.setTimeout(() => {
        coolingDown = false;
        situation.disabled = false;
      }, 1500);
    }
  }, 'situation tap-to-hear');

  situation.dataset.lineIndex = '0';
  situation.dataset.lineId = line.id;
  situation.setAttribute('aria-label', `${extraUi[state.language].repeatSituation}: ${situationText}`);

  if (timedWordsFor(line, wordTimings[state.language]?.[line.id])) {
    situation.dataset.wordTimingId = line.id;
    let wordIndex = 0;
    const parts = wordParts(situationText).map(part => {
      if (/^\s+$/u.test(part)) return document.createTextNode(part);
      const span = node('span', 'spoken-word', part);
      span.dataset.wordIndex = String(wordIndex++);
      return span;
    });
    situation.replaceChildren(...parts);
  }

  return situation;
}

function createReaderControls(situation, lines, sceneId, current) {
  const actions = node('div', 'reader-actions');
  const help = node('p', 'hint', current.hint);
  help.hidden = true;

  const replay = button('🔊  ' + ui['player.replayShort'], speechCooldown(async () => {
    situation.hidden = false;
    situation.scrollTop = 0;
    const played = await narrator.play(lines);
    if (!played && situation.isConnected) situation.hidden = false;
  }), 'secondary');
  replay.setAttribute('aria-label', ui['player.replay']);

  const helpButton = button('💡  ' + ui['player.helpShort'], speechCooldown(() => {
    narrator.stop();
    help.hidden = !help.hidden;
    if (!help.hidden) narrator.play([{ id: `${sceneId}.hint`, text: current.hint }]);
  }), 'secondary');
  helpButton.setAttribute('aria-label', ui['player.help']);

  actions.append(replay, helpButton);
  return { actions, help };
}

function createChoices(current, lines) {
  const choices = node('div', 'choices');
  current.choices.forEach((choice, index) => {
    const line = lines[index + 1];
    const row = node('div', 'choice-row');
    const chooseButton = button(choice.text, () => {}, 'choice-select');
    chooseButton.dataset.lineIndex = String(index + 1);
    chooseButton.dataset.lineId = line.id;
    chooseButton.setAttribute('aria-label', choice.text);
    attachHold(chooseButton, speechCooldown(() => narrator.play([line])), () => choose(index));

    const speaker = button('🔊', speechCooldown(() => narrator.play([line])), 'choice-speaker');
    speaker.setAttribute('aria-label', `${ui['player.choiceSpeaker']}: ${choice.text}`);
    row.append(chooseButton, speaker);
    choices.append(row);
  });
  return choices;
}

function renderReader(announce = true) {
  const current = session.scene;
  const id = session.id;
  const lines = linesForScene(id, current);
  root.replaceChildren(header(story.title, true), statusBox([...lines.map(line => line.id), `${id}.hint`]));
  const stage = node('section', 'stage');
  addSceneIllustrations(stage, sceneArt[id]);
  const loading = node('span', 'character-loading', '✦');
  loading.setAttribute('role', 'status');
  loading.setAttribute('aria-label', princessLoadText[state.language].loading);
  stage.append(loading);
  root.append(stage);
  const princessKey = state.princess;
  const showDragon = dragonInScene(id);
  stage.classList.toggle('has-dragon', showDragon);
  const oldDragon = stage.querySelector('.dragon-study');
  if (oldDragon) oldDragon.hidden = !showDragon;
  sharedStage.setSceneMotion(bodyMotion.scenes?.[id] || bodyMotion.default || {});
  sceneReady = sharedStage.mount(stage, { princess: princessKey, dragon: showDragon })
    .then(result => {
      if (!stage.isConnected || state.princess !== princessKey || result?.stale) return;
      stage.classList.add('shared-3d-ready');
      sharedStage.setTalking(stage.classList.contains('narrating'));
    })
    .catch(error => {
      console.error(`${princessKey} shared 3D stage failed:`, error);
      if (stage.isConnected) {
        loading.textContent = princessLoadText[state.language].failed;
        loading.setAttribute('aria-label', princessLoadText[state.language].failed);
        loading.classList.add('failed');
      }
    })
    .then(() => new Promise(resolve => {
      window.requestAnimationFrame(() => {
        curtain.remove();
        resolve();
      });
    }));

  if (announce) {
    sceneReady.then(() => {
      if (!stage.isConnected) return;
      narrator.play(lines).then(played => {
        if (played && !narrator.isPlaying() && current.ending && stage.isConnected && stage.classList.contains('shared-3d-ready')) {
          sharedStage.celebrate();
        }
      });
    });
  }
  const sheet = node('section', 'reader-sheet');
  if (current.ending) sheet.append(node('p', 'ending', ui['player.ending']));
  const situation = createSituationButton(current.situation, lines[0]);
  sheet.append(situation);
  const { actions, help } = createReaderControls(situation, lines, id, current);
  sheet.append(actions, help, createChoices(current, lines));
  root.append(sheet);
  const curtain = node('div', 'story-preparing', princessLoadText[state.language].loading);
  curtain.setAttribute('role', 'status');
  root.append(curtain);
}
function openGate() {
  const first = 12 + Math.floor(Math.random() * 8);
  const second = 12 + Math.floor(Math.random() * 8);
  gateAnswer = first + second;
  const panel = node('div', 'modal-panel');
  panel.append(node('h2', '', 'Parents'), node('p', '', `Grown-up check: What is ${first} + ${second}?`));
  const field = node('input');
  field.type = 'number';
  field.inputMode = 'numeric';
  field.setAttribute('aria-label', 'Answer to grown-up check');
  const error = node('p', 'gate-error');
  error.setAttribute('role', 'alert');

  const continueButton = button('Continue', () => {
    if (Number(field.value) !== gateAnswer || !field.value.trim()) {
      error.textContent = 'Please try again.';
      return;
    }
    renderSettings();
  }, 'primary');
  panel.append(field, error, continueButton, button('Cancel', () => overlay.replaceChildren(), 'quiet'));
  const backdrop = node('div', 'backdrop');
  backdrop.append(panel);
  overlay.replaceChildren(backdrop);
  field.focus();
}
function renderSettings() {
  const panel = node('div', 'modal-panel settings');
  panel.append(node('h2', '', 'Parent settings'), node('p', '', 'Changes are saved on this device.'));
  const langLabel = node('label', 'setting-label', 'Story language');
  const select = node('select');
  for (const [code, name] of [['en', 'English'], ['es', 'Español'], ['gu', 'ગુજરાતી']]) {
    const option = node('option', '', name);
    option.value = code;
    select.append(option);
  }
  select.value = state.language;
  select.addEventListener('change', () => {
    state.language = select.value;
    save();
    setNarrator();
    if (screen === 'reader') {
      const base = baseStories.find(item => item.id === story.id);
      story = localizeStory(base, localeContent[state.language]);
      session = startOrResume(story, state.progress);
    }
    render(false);
    renderSettings();
  });
  langLabel.append(select); panel.append(langLabel, node('h3', '', 'Choose Princess Alisha'));
  const picker = node('div', 'princess-picker');
  for (const key of ['adventure', 'star']) {
    const item = button(portrait[key].name + (state.princess === key ? ' ✓' : ''), () => {
      state.princess = key;
      save();
      render(false);
      renderSettings();
    }, 'princess-option');
    item.prepend(image(key));
    picker.append(item);
  }
  panel.append(picker);
  if (window.AndroidGameLock) {
    const pin = button('', () => window.AndroidGameLock.toggle(), 'secondary');
    pin.dataset.pinControl = 'true';
    const refreshPin = () => {
      const pinned = window.AndroidGameLock.isPinned();
      pin.textContent = `Keep game open: ${pinned ? 'On — turn off' : 'Off — turn on'}`;
      pin.setAttribute('aria-pressed', String(pinned));
    };
    refreshPin();
    const pinPoll = window.setInterval(() => {
      if (!panel.isConnected) {
        window.clearInterval(pinPoll);
        return;
      }
      refreshPin();
    }, 1000);
    panel.append(
      node('h3', '', 'Screen pinning'),
      pin,
      node('p', 'pinning-note', 'Android will ask you to confirm pinning. Enable Require PIN to unpin in phone settings for stronger protection.')
    );
  }
  panel.append(button('Close', () => overlay.replaceChildren(), 'primary'));
  const backdrop = node('div', 'backdrop');
  backdrop.append(panel);
  overlay.replaceChildren(backdrop);
}

function render(announce = true) {
  ui = uiContent[state.language];
  document.documentElement.lang = state.language;
  narrator?.stop();
  sharedStage.setTalking(false);
  sharedStage.unmount();
  document.body.classList.toggle('library-page', screen === 'library');
  document.body.classList.toggle('reader-page', screen === 'reader');
  if (screen === 'reader') renderReader(announce);
  else renderLibrary(announce);
}

window.addEventListener('android-game-lock', () => {
  if (overlay.querySelector('[data-pin-control]')) renderSettings();
});

async function init() {
  try {
    ({ baseStories, localeContent, uiContent, audioManifest, wordTimings, sceneArt, libraryCovers, bodyMotion } = await loadContent());
    state = normalizeState(readSavedState(browserStorage(window)), baseStories);
    ui = uiContent[state.language];
    setNarrator();
    render();
  } catch (error) {
    root.replaceChildren(node('p', 'load-error', `Alisha’s Adventures could not load: ${error.message}.`));
  }
}
init();

