import { NarrationController, playAudioUrl } from '../engine/narration.mjs';
import { timedWordsFor, wordIndexAtTime } from './word-highlighting.mjs';
import { narrationStatus } from './state.mjs';

// Recordings are mapped by stable line ID. Missing lines are reported, never replaced with device TTS.
export function createNarrator({ language, audioManifest = {}, wordTimings = {}, onHighlight, onWord, onStatus }) {
  let requestId = 0;
  const status = narrationStatus[language] || narrationStatus.en;
  const controller = new NarrationController({
    highlight: (index, line) => { onHighlight(index, line); onWord?.(null); },
    playLine: async (line, signal) => {
      const { id } = line;
      const url = audioManifest[language]?.[id];
      if (!url) throw new Error(`Narration pending: ${language}/${id}`);
      const words = id.endsWith('.situation') ? timedWordsFor(line, wordTimings[language]?.[id]) : null;
      let lastIndex = null;
      await playAudioUrl(url, signal, words ? time => {
        const index = wordIndexAtTime(words, time);
        if (index !== lastIndex) { lastIndex = index; onWord?.({ id, index }); }
      } : undefined);
      if (!signal.aborted) onWord?.(null);
    }
  });
  return {
    stop: () => { requestId++; controller.stop(); onStatus(status.ready); },
    isPlaying: () => controller.active !== null,
    async play(lines) {
      const request = ++requestId;
      controller.stop();
      const missing = lines.filter(({ id }) => !audioManifest[language]?.[id]);
      if (missing.length) { onStatus(`Narration pending (${language.toUpperCase()}): ${missing.length} line${missing.length === 1 ? '' : 's'} on this request ${missing.length === 1 ? 'has' : 'have'} no recording.`); return false; }
      onStatus(status.playing);
      try { const completed = (await controller.play(lines)) && request === requestId; if (completed) onStatus(status.ready); return completed; }
      catch (error) { if (request === requestId) onStatus(error.message); return false; }
    }
  };
}
