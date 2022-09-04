export function formatDuration(seconds: string) {
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

export function hrToSeconds(hrtime: [number, number]) {
  const raw = hrtime[0] + hrtime[1] / 1e9;
  return raw.toFixed(2);
}
