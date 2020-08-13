import { Config } from "../types/Config";

export function getNpmCommand(config: Config, task: string) {
  const { node, args } = config;
  const extraArgs = args.length > 0 ? ["--", ...args] : [];
  return [...node, "run", task, ...extraArgs];
}
