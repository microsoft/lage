import { Target } from "../types/Target";
import EventEmitter from "events";

export function npmScriptRunner(target: Target) {
  const emitter = new EventEmitter();

  return emitter;
}