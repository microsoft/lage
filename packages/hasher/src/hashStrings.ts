import crypto from "crypto";

export function hashStrings(strings: string | string[]): string {
  const hasher = crypto.createHash("sha1");
  const anArray = typeof strings === "string" ? [strings] : strings;
  const elements = [...anArray];
  elements.sort((a, b) => a.localeCompare(b));
  elements.forEach((element) => hasher.update(element));

  return hasher.digest("hex");
}

export function hashStringsNoSort(strings: string[]): string {
  const hasher = crypto.createHash("sha1");
  for (const str of strings) {
    hasher.update(str);
  }
  return hasher.digest("hex");
}
