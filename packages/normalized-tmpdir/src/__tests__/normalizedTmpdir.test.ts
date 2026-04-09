import { describe, it, jest, afterEach, expect } from "@jest/globals";
import type fsType from "fs";
import { clearWindowsCache, normalizedTmpdir } from "../normalizedTmpdir.js";
import { doWindowsMocks, paths } from "./mocks.js";

jest.mock("fs");

const realFs = jest.requireActual<typeof fsType>("fs");

describe("normalizedTmpdir", function () {
  afterEach(() => {
    clearWindowsCache();
    jest.restoreAllMocks();
  });

  it("returns a real path", () => {
    // this is intentionally specific to the OS the test is running on
    const tmpdir = normalizedTmpdir();
    expect(tmpdir).toEqual(realFs.realpathSync(tmpdir));
  });

  it("does not attempt to expand long paths", () => {
    const mocks = doWindowsMocks();
    mocks.tmpdir.mockImplementation(() => paths.longTemp);

    expect(normalizedTmpdir()).toEqual(paths.longTemp);
    // expandShortPath would call this function
    expect(mocks.homedir).not.toHaveBeenCalled();
  });

  it("caches return values", () => {
    const mocks = doWindowsMocks();

    const tmpdir = normalizedTmpdir();
    expect(tmpdir).toEqual(paths.longTemp);
    // expandShortPath should have called this function
    expect(mocks.homedir).toHaveBeenCalledTimes(1);

    expect(normalizedTmpdir()).toEqual(paths.longTemp);
    // should not call it again due to cache
    expect(mocks.homedir).toHaveBeenCalledTimes(1);
  });

  it("on failure, does not recalculate", () => {
    const mocks = doWindowsMocks();
    // cause homedir comparison to fail
    mocks.statSync.mockImplementationOnce(() => ({ ino: 2 }) as fsType.Stats);

    expect(normalizedTmpdir()).toBe(paths.shortTemp);
    expect(mocks.spawnSync).toHaveBeenCalled(); // verify it went to failure path

    // try again and verify it doesn't call spawnSync again
    mocks.spawnSync.mockClear();
    expect(normalizedTmpdir()).toBe(paths.shortTemp);
    expect(mocks.spawnSync).not.toHaveBeenCalled();
  });

  it("on failure, does not log by default", () => {
    const logSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mocks = doWindowsMocks();
    // cause homedir comparison to fail
    mocks.statSync.mockImplementationOnce(() => ({ ino: 2 }) as fsType.Stats);

    expect(normalizedTmpdir()).toBe(paths.shortTemp);
    expect(mocks.spawnSync).toHaveBeenCalled(); // verify it went to failure path
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("on failure, logs to default console if console: true", () => {
    const logSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const mocks = doWindowsMocks();
    mocks.statSync.mockImplementationOnce(() => ({ ino: 2 }) as fsType.Stats);

    expect(normalizedTmpdir({ console: true })).toBe(paths.shortTemp);
    expect(mocks.spawnSync).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it("on failure, logs to provided console", () => {
    const mockLog = jest.fn();
    const mocks = doWindowsMocks();
    mocks.statSync.mockImplementationOnce(() => ({ ino: 2 }) as fsType.Stats);

    expect(normalizedTmpdir({ console: { warn: mockLog } })).toBe(paths.shortTemp);
    expect(mocks.spawnSync).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalled();
  });
});
