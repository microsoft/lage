import { lstatSync } from "fs";
import { createRequire } from "module";
import path from "path";
import type { Logger } from "backfill-logger";

export type NativeOutputValidator = (
  cwd: string,
  files: string[],
  fingerprints: string[]
) => Promise<boolean>;

interface NativeBinding {
  apiVersion: 1;
  validateOutputs: NativeOutputValidator;
}

type NativeMode = "auto" | "disabled" | "required";
type BindingResult =
  | { kind: "loaded"; binding: NativeBinding }
  | { kind: "missing" | "failed"; message: string };

let bindingResult: BindingResult | undefined;
let reported = false;

/** An explicitly required native validator must not fall back to cache restoration. */
export class NativeCacheValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NativeCacheValidationError";
  }
}

export function getNativeOutputValidator(
  logger: Pick<Logger, "verbose" | "warn">
): NativeOutputValidator | undefined {
  const mode = getMode();
  if (mode === "disabled") {
    return undefined;
  }

  bindingResult ??= loadBinding();
  if (bindingResult.kind !== "loaded") {
    if (mode === "required") {
      throw new NativeCacheValidationError(bindingResult.message);
    }
    if (!reported) {
      const message = `${bindingResult.message}; using JavaScript output validation`;
      if (bindingResult.kind === "failed") {
        logger.warn(message);
      } else {
        logger.verbose(message);
      }
      reported = true;
    }
    return undefined;
  }

  if (!reported) {
    logger.verbose("Using Rust cache output validation");
    reported = true;
  }
  const { binding } = bindingResult;
  return async (cwd, files, fingerprints) => {
    try {
      const valid = await binding.validateOutputs(cwd, files, fingerprints);
      if (typeof valid !== "boolean") {
        throw new Error("Native cache validator returned a non-boolean result");
      }
      return valid;
    } catch (error) {
      if (mode === "required") {
        throw new NativeCacheValidationError(
          `Native cache validation failed: ${errorMessage(error)}`
        );
      }
      throw error;
    }
  };
}

function getMode(): NativeMode {
  const value = (process.env.BACKFILL_CACHE_NATIVE ?? "auto")
    .trim()
    .toLowerCase();
  switch (value) {
    case "":
    case "auto":
      return "auto";
    case "0":
    case "false":
      return "disabled";
    case "1":
    case "true":
      return "required";
    default:
      throw new NativeCacheValidationError(
        "BACKFILL_CACHE_NATIVE must be auto, 0/false, or 1/true"
      );
  }
}

function loadBinding(): BindingResult {
  const filename = `cache-validator-${process.platform}-${process.arch}.node`;
  const candidates = [
    path.join(__dirname, "native", filename),
    // The bundled task worker is one directory below the CLI's native assets.
    path.join(__dirname, "..", "native", filename),
  ];
  if (path.basename(__dirname) === "src") {
    candidates.push(path.join(__dirname, "..", "lib", "native", filename));
  }

  for (const filenamePath of candidates) {
    try {
      if (!lstatSync(filenamePath).isFile()) {
        continue;
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR")
      ) {
        continue;
      }
      return {
        kind: "failed",
        message: `Cannot access native cache validator: ${errorMessage(error)}`,
      };
    }

    try {
      // Node loads N-API addons through CommonJS, including in ESM consumers.
      const loadNative = createRequire(__filename);
      const binding: unknown = loadNative(filenamePath);
      if (!isNativeBinding(binding)) {
        return {
          kind: "failed",
          message: "Native cache validator has an incompatible API version",
        };
      }
      return { kind: "loaded", binding };
    } catch (error) {
      return {
        kind: "failed",
        message: `Cannot load native cache validator: ${errorMessage(error)}`,
      };
    }
  }

  return {
    kind: "missing",
    message:
      "Native cache validator is not installed; from a Lage checkout, run yarn workspace backfill-cache native:build",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNativeBinding(binding: unknown): binding is NativeBinding {
  return (
    typeof binding === "object" &&
    binding !== null &&
    "apiVersion" in binding &&
    binding.apiVersion === 1 &&
    "validateOutputs" in binding &&
    typeof binding.validateOutputs === "function"
  );
}
