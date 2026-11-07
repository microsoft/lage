import { describe, it, jest, afterEach, expect, beforeAll, afterAll } from "@jest/globals";
import child_process from "child_process";
import type { default as fsType } from "fs";
import os from "os";
import path from "path";
import { doWindowsMocks, paths, removeTempDir } from "./mocks.js";
import { expandShortPath } from "../expandShortPath.js";

jest.mock("fs");

const realFs = jest.requireActual<typeof fsType>("fs");

const throwError = () => {
  throw new Error("Unexpected call");
};

/** Emulate the actual result format of `attrib` */
const attribResult = (str: string) => ({ stdout: " ".repeat(19) + str + "\r\n" }) as any;

/** Windows only: get the actual short name of a file/directory */
function getShortName(dir: string) {
  const res = child_process.spawnSync("cmd", ["/s", "/c", `for %A in ("${dir}") do @echo %~sA`], {
    shell: true,
  });
  if (res.status !== 0) {
    throw new Error(`Could not get short name of ${dir}: ${res.stderr.toString()}`);
  }
  return res.stdout.toString().trim();
}

describe("expandShortPath", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns false for non-windows platforms", () => {
    const mocks = doWindowsMocks({ throw: true });
    mocks.platform.mockImplementation(() => "linux");
    expect(expandShortPath(paths.shortTemp)).toBe(false);
  });

  it.each<[string, string]>([
    ["empty path", ""],
    ["Unix-style path", "/foo/bar"],
    ["network path", "\\\\foo\\bar"],
    ["relative path (no dot)", "foo\\bar"],
    ["relative path with dot", ".\\foo\\bar"],
  ])("returns false for %s", (_, p) => {
    doWindowsMocks({ throw: true });
    expect(expandShortPath(p)).toBe(false);
  });

  it("does no extra calculations for long paths", () => {
    const mocks = doWindowsMocks({ throw: true });
    mocks.existsSync.mockImplementation(() => true);
    expect(expandShortPath("C:\\")).toBe("C:\\");
    expect(expandShortPath(paths.longTemp)).toBe(paths.longTemp);
  });

  it("uses os.homedir() as replacement if possible", () => {
    const mocks = doWindowsMocks();
    mocks.homedir.mockImplementation(() => paths.homeDir);

    expect(expandShortPath(paths.shortTemp)).toBe(paths.longTemp);
    expect(mocks.homedir).toHaveBeenCalledTimes(1);
  });

  it("does not use os.homedir() if inodes do not match", () => {
    const mocks = doWindowsMocks();
    mocks.statSync.mockImplementationOnce(() => ({ ino: 1 }) as fsType.Stats).mockImplementationOnce(() => ({ ino: 2 }) as fsType.Stats);

    // this will fall back to the "attrib" method, which hasn't been configured and will throw
    expect(expandShortPath(paths.shortTemp)).toBe(false);
    expect(mocks.statSync).toHaveBeenCalledTimes(2);
    expect(mocks.spawnSync).toHaveBeenCalledTimes(1);
  });

  it('uses "attrib" to find the long path', () => {
    const mocks = doWindowsMocks();
    mocks.spawnSync.mockImplementationOnce(() => attribResult(path.win32.dirname(paths.weirdLongTemp))).mockImplementation(throwError);

    expect(expandShortPath(paths.weirdShortTemp)).toBe(paths.weirdLongTemp);
    expect(mocks.spawnSync).toHaveBeenCalledTimes(1);
  });

  it('uses "attrib" to find long path with multiple short segments', () => {
    const mocks = doWindowsMocks();
    mocks.spawnSync
      .mockImplementationOnce(() => attribResult(path.win32.dirname(path.win32.dirname(paths.veryWeirdLongTemp))))
      .mockImplementationOnce(() => attribResult(path.win32.dirname(paths.veryWeirdLongTemp)))
      .mockImplementation(throwError);

    expect(expandShortPath(paths.veryWeirdShortTemp)).toBe(paths.veryWeirdLongTemp);
    expect(mocks.spawnSync).toHaveBeenCalledTimes(2);
  });

  it('uses "attrib" to find long path under home directory with multiple short segments', () => {
    const mocks = doWindowsMocks();
    mocks.spawnSync
      .mockImplementationOnce(() => attribResult(path.win32.dirname(path.win32.dirname(paths.homeWeirdLongTemp))))
      .mockImplementationOnce(() => attribResult(path.win32.dirname(paths.homeWeirdLongTemp)))
      .mockImplementation(throwError);

    expect(expandShortPath(paths.homeWeirdShortTemp)).toBe(paths.homeWeirdLongTemp);
    expect(mocks.spawnSync).toHaveBeenCalledTimes(2);
  });

  it('returns false if "attrib" returns an error', () => {
    const mocks = doWindowsMocks();
    mocks.spawnSync.mockImplementation(() => ({ stdout: `File not found - D:\\whatever` }) as any);

    expect(expandShortPath(paths.weirdShortTemp)).toBe(false);
    expect(mocks.spawnSync).toHaveBeenCalledTimes(1);
  });

  // eslint-disable-next-line no-restricted-properties -- intentional skipped test per platform
  const windowsDescribe = os.platform() === "win32" ? describe : describe.skip;
  windowsDescribe("windows (real filesystem)", () => {
    let testRoot = "";
    let tempDirs: string[] = [];

    beforeAll(() => {
      testRoot = realFs.mkdtempSync(path.join(os.tmpdir(), "normalized-tmpdir-"));
    });

    afterAll(() => {
      removeTempDir(testRoot);
    });

    afterEach(() => {
      tempDirs.forEach((dir) => removeTempDir(dir));
      tempDirs = [];
    });

    // test home directory expansion for real if possible
    const homedir = os.homedir();
    console.log("homedir", homedir);
    console.log("tmpdir", os.tmpdir());

    // eslint-disable-next-line no-restricted-properties -- intentional skipped test
    (/^[a-z]:\\Users\\[^~\\]{9,}$/i.test(homedir) ? it : it.skip)("expands short home directory", () => {
      const shortName = getShortName(homedir);
      expect(shortName).toMatch(/~/);

      const spawnSpy = jest.spyOn(child_process, "spawnSync");
      const expanded = expandShortPath(shortName);
      expect(expanded).not.toBe(false);
      expect((expanded as string).toLowerCase()).toBe(homedir.toLowerCase());
      expect(spawnSpy).not.toHaveBeenCalled();
    });

    it.each([
      { long: "foo bar baz", short: "FOOBAR~1" },
      { long: "foo^bar^baz", short: "FOO^BA~1" },
      { long: "foo%bar%baz", short: "FOO%BA~1" },
      // this relies on the first directory already being created
      { long: "foo bar baz\\very long name", short: "FOOBAR~1\\VERYLO~1" },
    ])('expands "$short" ("$long") using attrib', ({ long, short }) => {
      const longPath = path.join(testRoot, long);
      const shortPath = path.join(testRoot, short);
      realFs.mkdirSync(longPath);
      expect(realFs.existsSync(shortPath)).toBe(true);

      const spawnSpy = jest.spyOn(child_process, "spawnSync");
      const expanded = expandShortPath(shortPath);
      expect(expanded).toBeTruthy();
      expect(expanded).not.toMatch(/~/);
      expect(realFs.statSync(String(expanded)).ino).toBe(realFs.statSync(longPath).ino);
      expect(spawnSpy).toHaveBeenCalled();
    });
  });
});
