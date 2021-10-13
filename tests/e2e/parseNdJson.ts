export function parseNdJson(ndjson: string) {
  const entries = ndjson.substr(ndjson.indexOf("{"));

  return entries.split("\n").map((line) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return {};
    }
  });
}
