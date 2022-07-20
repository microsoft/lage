import { Target } from "../types/Target";
import EventEmitter from "events";

// TODO: next step - how to run a npm script?
export function npmScriptRunner(target: Target) {
  const emitter = new EventEmitter();

  return emitter;
}