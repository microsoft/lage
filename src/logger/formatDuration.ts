export function formatDuration(hrtime: [number, number]) {
  let raw = hrtime[0] + hrtime[1] / 1e9;
  if (raw > 60) {
    const minutes = Math.floor(raw / 60);
    const seconds = (raw - minutes * 60).toFixed(2);
    return `${minutes}m ${seconds}s`;
  } else {
    const seconds = raw.toFixed(2);
    return `${seconds}s`;
  }
}
