export function formatDuration(seconds: string): string {
  const raw = parseFloat(seconds);
  if (raw > 60) {
    const minutes = Math.floor(raw / 60);
    const seconds = (raw - minutes * 60).toFixed(2);
    return `${minutes}m ${seconds}s`;
  } else {
    const seconds = raw.toFixed(2);
    return `${seconds}s`;
  }
}

export function hrToSeconds(hrtime: [number, number]): string {
  const raw = hrtime[0] + hrtime[1] / 1e9;
  return raw.toFixed(2);
}

/**
 * calculates the difference of two hrtime values
 * @param start
 * @param end
 * @returns
 */
export function hrtimeDiff(start: [number, number] = [0, 0], end: [number, number] = [0, 0]): [number, number] {
  const sec = end[0] - start[0];
  const nsec = end[1] - start[1];

  if (nsec < 0) {
    return [Math.max(0, sec - 1), 1e9 + nsec];
  }

  return [sec, nsec];
}
