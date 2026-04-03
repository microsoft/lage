/** Format a duration given in seconds as minutes and seconds: e.g. "90" → "1m 30.00s" */
export function formatDuration(seconds: string): string {
  const raw = parseFloat(seconds);
  if (raw > 60) {
    const minutes = Math.floor(raw / 60);
    const sec = (raw - minutes * 60).toFixed(2);
    return `${minutes}m ${sec}s`;
  }
  const sec = raw.toFixed(2);
  return `${sec}s`;
}

/** Format an hrtime tuple as a human-readable duration */
export function formatHrtime(hrtime: [number, number]): string {
  return formatDuration(hrToSeconds(hrtime));
}

/** Convert an hrtime tuple to seconds */
export function hrToSeconds(hrtime: [number, number]): string {
  const raw = hrtime[0] + hrtime[1] / 1e9;
  return raw.toFixed(2);
}

/**
 * calculates the difference of two hrtime values
 */
export function hrtimeDiff(start: [number, number] = [0, 0], end: [number, number] = [0, 0]): [number, number] {
  const sec = end[0] - start[0];
  const nsec = end[1] - start[1];

  if (nsec < 0) {
    return [Math.max(0, sec - 1), 1e9 + nsec];
  }

  return [sec, nsec];
}
