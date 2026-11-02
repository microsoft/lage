import { afterEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import Module from "module";
import { makeLogger } from "backfill-logger";
import type * as NativeValidatorModule from "../nativeOutputValidator.js";

const originalMode = process.env.BACKFILL_CACHE_NATIVE;
const realRequire = Module.createRequire(__filename);
const fileStat = fs.lstatSync(__filename);

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.BACKFILL_CACHE_NATIVE;
  } else {
    process.env.BACKFILL_CACHE_NATIVE = originalMode;
  }
  jest.restoreAllMocks();
  jest.resetModules();
});

function loadValidator(mode = "auto") {
  process.env.BACKFILL_CACHE_NATIVE = mode;
  jest.resetModules();
  return jest.requireActual<typeof NativeValidatorModule>(
    "../nativeOutputValidator.js"
  );
}

function mockBinding(binding: unknown) {
  const stat = jest.spyOn(fs, "lstatSync").mockReturnValue(fileStat);
  const load = jest.fn<(...args: unknown[]) => unknown>(() => binding);
  jest.spyOn(Module, "createRequire").mockReturnValue(
    new Proxy(realRequire, {
      apply(_target, _thisArg, args: unknown[]) {
        return load(...args);
      },
    })
  );
  return { load, stat };
}

function mockMissingBinary() {
  return jest.spyOn(fs, "lstatSync").mockImplementation(() => {
    const error: NodeJS.ErrnoException = new Error("missing binary");
    error.code = "ENOENT";
    throw error;
  });
}

describe("optional native output validation", () => {
  it.each(["0", "false", " FALSE "])(
    "does not load or probe a binary when disabled (%s)",
    (mode) => {
      const { getNativeOutputValidator } = loadValidator(mode);
      const { load, stat } = mockBinding(null);

      expect(getNativeOutputValidator(makeLogger("mute"))).toBeUndefined();
      expect(stat).not.toHaveBeenCalled();
      expect(load).not.toHaveBeenCalled();
    }
  );

  it("uses JavaScript when an optional binary is absent", () => {
    const { getNativeOutputValidator } = loadValidator();
    const stat = mockMissingBinary();
    const logger = makeLogger("mute");
    const verbose = jest.spyOn(logger, "verbose");
    const warn = jest.spyOn(logger, "warn");

    expect(getNativeOutputValidator(logger)).toBeUndefined();
    const probes = stat.mock.calls.length;
    expect(getNativeOutputValidator(logger)).toBeUndefined();

    expect(stat).toHaveBeenCalledTimes(probes);
    expect(verbose).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(["1", "true"])(
    "fails explicitly when a required binary is absent (%s)",
    (mode) => {
      const { getNativeOutputValidator, NativeCacheValidationError } =
        loadValidator(mode);
      mockMissingBinary();

      expect(() => getNativeOutputValidator(makeLogger("mute"))).toThrow(
        NativeCacheValidationError
      );
    }
  );

  it("rejects invalid mode values rather than silently choosing a backend", () => {
    const { getNativeOutputValidator } = loadValidator("typo");

    expect(() => getNativeOutputValidator(makeLogger("mute"))).toThrow(
      "BACKFILL_CACHE_NATIVE must be"
    );
  });

  it("warns once and falls back for an incompatible optional binary", () => {
    const { getNativeOutputValidator } = loadValidator();
    mockBinding({ apiVersion: 2, validateOutputs: () => true });
    const logger = makeLogger("mute");
    const warn = jest.spyOn(logger, "warn");

    expect(getNativeOutputValidator(logger)).toBeUndefined();
    expect(getNativeOutputValidator(logger)).toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("incompatible API")
    );
  });

  it("reuses the native binding and passes the complete validation batch", async () => {
    const { getNativeOutputValidator } = loadValidator("1");
    const validateOutputs = jest
      .fn<
        (cwd: string, files: string[], hashes: string[]) => Promise<boolean>
      >()
      .mockResolvedValue(true);
    const { load } = mockBinding({ apiVersion: 1, validateOutputs });
    const logger = makeLogger("mute");

    const validate = getNativeOutputValidator(logger)!;
    await expect(validate("root", ["output"], ["fingerprint"])).resolves.toBe(
      true
    );
    getNativeOutputValidator(logger);

    expect(validateOutputs).toHaveBeenCalledWith(
      "root",
      ["output"],
      ["fingerprint"]
    );
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not turn a native validation error into a successful hit", async () => {
    const { getNativeOutputValidator, NativeCacheValidationError } =
      loadValidator("1");
    const validateOutputs = jest
      .fn<() => Promise<boolean>>()
      .mockRejectedValue(new Error("Access denied"));
    mockBinding({ apiVersion: 1, validateOutputs });

    await expect(
      getNativeOutputValidator(makeLogger("mute"))!("root", ["a"], ["b"])
    ).rejects.toThrow(NativeCacheValidationError);
  });

  it("rejects a native return value that does not satisfy the ABI", async () => {
    const { getNativeOutputValidator } = loadValidator("1");
    mockBinding({
      apiVersion: 1,
      validateOutputs: () => Promise.resolve("true"),
    });

    await expect(
      getNativeOutputValidator(makeLogger("mute"))!("root", ["a"], ["b"])
    ).rejects.toThrow("non-boolean");
  });
});
