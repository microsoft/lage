import { TargetStatus } from "@lage-run/scheduler";

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

export function filterEntry(data: any, pkg: string, task: string, status: TargetStatus) {
  return data?.target?.packageName === pkg && data?.target?.task === task && data.status === status;
}
