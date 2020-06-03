import { RunContext } from "../types/RunContext";

export function abort(context: RunContext) {
  context.events.emit("abort");
}

export function setMaxEventListeners(context: RunContext) {
  // context.events.setMaxListeners(context.tasks.size);
}
