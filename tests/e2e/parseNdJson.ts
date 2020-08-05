export function parseNdJson(ndjson: string) {
  return ndjson.split("\n").map((line) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return {};
    }
  });
}
