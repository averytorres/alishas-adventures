// The timing file stores one [start, end] pair for each non-space token in the displayed text.
export function wordParts(text) {
  return text.match(/\s+|\S+/gu) ?? [];
}

export function timedWordsFor(line, timing) {
  if (!timing || timing.text !== line.text) return null;
  const words = wordParts(line.text).filter(part => !/^\s+$/u.test(part));
  if (words.length !== timing.words?.length) return null;
  if (!timing.words.every(([start, end], index) =>
    Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start &&
    (index === 0 || start >= timing.words[index - 1][0]))) return null;
  return timing.words;
}

export function wordIndexAtTime(words, time) {
  if (!words || !Number.isFinite(time)) return null;
  let low = 0, high = words.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end] = words[middle];
    if (time < start) high = middle - 1;
    else if (time >= end) low = middle + 1;
    else return middle;
  }
  return null;
}

// Keep the current word in a comfortable reading band without scrolling for every word.
export function wordScrollDelta(rect, viewportHeight) {
  if (!rect || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  const upperEdge = Math.max(68, viewportHeight * .14);
  const lowerEdge = viewportHeight * .72;
  if (rect.top < upperEdge) return rect.top - Math.max(90, viewportHeight * .25);
  if (rect.bottom > lowerEdge) return rect.bottom - viewportHeight * .60;
  return 0;
}
