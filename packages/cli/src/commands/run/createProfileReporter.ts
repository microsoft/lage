import { ChromeTraceEventsReporter } from "@lage-run/reporters";

export function createProfileReporter(options: { concurrency: number; profile: string | boolean | undefined }) {
  const { concurrency, profile } = options;
  return new ChromeTraceEventsReporter({
    concurrency,
    outputFile: typeof profile === "string" ? profile : undefined,
  });
}
