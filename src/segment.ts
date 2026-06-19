/**
 * Split raw message text into paragraph segments on blank-line boundaries.
 * Fenced code blocks (``` or ~~~) are atomic: blank lines inside them are content.
 */
export function segmentParagraphs(raw: string): string[] {
  const lines = raw.split('\n');
  const segments: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let fenceChar = '';

  const flush = () => {
    if (current.some((l) => l.trim() !== '')) {
      segments.push(current.join('\n').trim());
    }
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      current.push(line);
      continue;
    }

    if (!inFence && line.trim() === '') {
      flush();
      continue;
    }

    current.push(line);
  }
  flush();

  return segments;
}
