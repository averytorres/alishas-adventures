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
    const currentRun = new AbortController();
    this.active = currentRun;
    try {
      for (let index = 0; index < lines.length; index++) {
        if (currentRun.signal.aborted) break;
        this.highlight(index, lines[index]);
        await this.playLine(lines[index], currentRun.signal);
      }
      return !currentRun.signal.aborted;
    } finally {
      if (this.active === currentRun) {
        this.active = null;
        this.highlight(null);
      }
    }
  }
}

export function playAudioUrl(url, signal, onTime) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const audio = new Audio(url);
    let finished = false;
    const timer = onTime ? setInterval(() => {
      if (!finished) onTime(audio.currentTime);
    }, 70) : null;

    const finish = error => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      signal.removeEventListener('abort', abortPlayback);
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (error) reject(error);
      else resolve();
    };

    const abortPlayback = () => finish();
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error(`Could not play audio: ${url}`));
    signal.addEventListener('abort', abortPlayback, { once: true });
    if (signal.aborted) {
      abortPlayback();
      return;
    }

    try {
      Promise.resolve(audio.play()).catch(finish);
    } catch (error) {
      finish(error);
    }
  });
}
