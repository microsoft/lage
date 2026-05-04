import type { LageServiceRunTargetResult } from "@lage-run/rpc";

export type LageServiceStatusData = {
  pid: number | undefined;
  isServerRunning?: boolean;
};

export type LageServiceErrorData = { error: unknown };

/** All the custom message data logged by the lage service-related code */
export type LageServiceLogData = LageServiceStatusData | LageServiceErrorData | LageServiceRunTargetResult;
