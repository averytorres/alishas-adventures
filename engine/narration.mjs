// One controller per player: a new request always cancels the previous speech.
export class NarrationController {
  constructor({ playLine, highlight }) {
    this.playLine = playLine;
    this.highlight = highlight;
    this.active = null;
  }
  stop() {
    this.active?.abort();
    this.active = null;
    this.highlight(null);
  }
  async play(lines) {
    this.stop();
    const run = new AbortController();
    this.active = run;
    try {
      for (let i = 0; i < lines.length; i++) {
        if (run.signal.aborted) break;
        this.highlight(i, lines[i]);
        await this.playLine(lines[i], run.signal);
      }
      return !run.signal.aborted;
    } finally {
      if (this.active === run) {
        this.active = null;
        this.highlight(null);
      }
    }
  }
}

export function playAudioUrl(url, signal, onTime) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return resolve();
    const audio = new Audio(url);
    let finished = false;
    const timer = onTime ? setInterval(() => { if (!finished) onTime(audio.currentTime); }, 70) : null;
    const done = error => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      signal.removeEventListener('abort', aborted);
      audio.onended = null;
      audio.onerror = null;
      audio.pause(); audio.removeAttribute('src'); audio.load();
      if (error) reject(error);
      else resolve();
    };
    const aborted = () => done();
    audio.onended = () => done();
    audio.onerror = () => done(new Error(`Could not play audio: ${url}`));
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) return aborted();
    try { Promise.resolve(audio.play()).catch(done); }
    catch (error) { done(error); }
  });
}
