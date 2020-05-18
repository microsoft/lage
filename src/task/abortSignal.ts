import { RunContext } from "../types/RunContext";

export function abort(context: RunContext) {
  context.events.emit("abort");
}
