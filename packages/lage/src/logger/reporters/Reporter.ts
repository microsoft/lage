import { LogEntry } from "../LogEntry";
import { RunContext } from "../../types/RunContext";

export interface Reporter {
  log(entry: LogEntry): void;
  summarize(context: RunContext): void;
}
