import { Logger } from "./Logger";

let logger: Logger;
export function getLogger() {
  if (!logger) {
    logger = new Logger();
  }
  return logger;
}