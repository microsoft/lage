export const START_MARKER_PREFIX = "## WORKER:START:";
export const END_MARKER_PREFIX = "## WORKER:END:";

export function startMarker(id: string) {
  return `${START_MARKER_PREFIX}${id}`;
}

export function endMarker(id: string) {
  return `${END_MARKER_PREFIX}${id}`;
}
