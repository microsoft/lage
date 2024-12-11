export function normalizeTargetFileName(target: string) {
  return target.replace(/[^a-z0-9.]/gi, "_");
}
