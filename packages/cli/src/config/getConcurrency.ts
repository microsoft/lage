import os from "os";

export function getConcurrency(optionsConcurrency: number | undefined, configConcurrency: number | undefined): number {
  return optionsConcurrency || configConcurrency || os.cpus().length - 1;
}
