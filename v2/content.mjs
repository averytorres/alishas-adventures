import { LANGUAGES } from './state.mjs';

// Each entry contains everything needed to add one story to the library.
// Keep this list in the same order as the story cards should appear.
const storyFiles = [
  {
    story: '../story/alisha-lost-star.json',
    locales: {
      en: '../story/locales/en.draft.json',
      es: '../story/locales/es.draft.json',
      gu: '../story/locales/gu.draft.json'
    },
    audio: '../audio/manifest.json',
    timings: '../audio/word-timings.draft.json',
    art: '../story/scene-art.draft.json',
    covers: '../story/library-covers.draft.json',
    motion: '../story/body-motion.draft.json'
  },
  {
    story: '../story/alisha-sleepy-castle.json',
    locales: {
      en: '../story/locales/sleepy.en.json',
      es: '../story/locales/sleepy.es.json',
      gu: '../story/locales/sleepy.gu.json'
    },
    audio: '../audio/sleepy-manifest.json',
    timings: '../audio/sleepy-word-timings.json',
    art: '../story/sleepy-scene-art.json',
    covers: '../story/sleepy-library-covers.json',
    motion: '../story/sleepy-body-motion.json'
  },
  {
    story: '../story/alisha-cloud-wouldnt-rain.json',
    locales: {
      en: '../story/locales/cloud.en.json',
      es: '../story/locales/cloud.es.json',
      gu: '../story/locales/cloud.gu.json'
    },
    audio: '../audio/cloud-manifest.json',
    timings: '../audio/cloud-word-timings.json',
    art: '../story/cloud-scene-art.json',
    covers: '../story/cloud-library-covers.json',
    motion: '../story/cloud-body-motion.json'
  }
];

const uiFiles = {
  en: '../story/locales/ui.en.draft.json',
  es: '../story/locales/ui.es.draft.json',
  gu: '../story/locales/ui.gu.draft.json'
};

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`);
  return response.json();
}

async function loadStory(files, readJson) {
  const [story, locales, audio, timings, art, covers, motion] = await Promise.all([
    readJson(files.story),
    Promise.all(LANGUAGES.map(language => readJson(files.locales[language]))),
    readJson(files.audio),
    readJson(files.timings),
    readJson(files.art),
    readJson(files.covers),
    readJson(files.motion)
  ]);

  return {
    story,
    locales: Object.fromEntries(LANGUAGES.map((language, index) => [language, locales[index]])),
    audio,
    timings,
    art,
    covers,
    motion
  };
}

function mergeLanguageData(stories, section, field) {
  return Object.fromEntries(LANGUAGES.map(language => [
    language,
    Object.assign({}, ...stories.map(story => story[section][field][language]))
  ]));
}

export async function loadContent(readJson = loadJson) {
  const [stories, uiFilesByLanguage] = await Promise.all([
    Promise.all(storyFiles.map(files => loadStory(files, readJson))),
    Promise.all(LANGUAGES.map(language => readJson(uiFiles[language])))
  ]);

  const localeContent = Object.fromEntries(LANGUAGES.map(language => [
    language,
    {
      language,
      lines: Object.assign({}, ...stories.map(story => story.locales[language].lines))
    }
  ]));

  return {
    baseStories: stories.map(({ story }) => story),
    localeContent,
    uiContent: Object.fromEntries(LANGUAGES.map((language, index) => [language, uiFilesByLanguage[index].lines])),
    audioManifest: mergeLanguageData(stories, 'audio', 'recordings'),
    wordTimings: mergeLanguageData(stories, 'timings', 'timings'),
    sceneArt: Object.assign({}, ...stories.map(story => story.art.scenes)),
    libraryCovers: Object.assign({}, ...stories.map(story => story.covers.stories)),
    bodyMotion: {
      ...stories[0].motion,
      scenes: Object.assign({}, ...stories.map(story => story.motion.scenes))
    }
  };
}
