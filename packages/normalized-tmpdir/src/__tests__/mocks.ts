import { jest } from "@jest/globals";
import child_process from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const realOs = jest.requireActual<typeof os>("os");

export const paths = {
  homeDir: "C:\\Users\\VeryLongName",
  shortTemp: "C:\\Users\\VERYLO~1\\AppData\\Local\\Temp",
  longTemp: "C:\\Users\\VeryLongName\\AppData\\Local\\Temp",
  weirdShortTemp: "D:\\VERYLO~1\\Temp",
  weirdLongTemp: "D:\\VeryLongName\\Temp",
  veryWeirdShortTemp: "D:\\VERYLO~1\\EXTRAS~1\\Temp",
  veryWeirdLongTemp: "D:\\VeryLongName\\ExtraStuff\\Temp",
  homeWeirdShortTemp: "C:\\Users\\VERYLO~1\\EXTRAS~1\\Temp",
  homeWeirdLongTemp: "C:\\Users\\VeryLongName\\ExtraStuff\\Temp",
};

const noOp = (val: any) => val;
const throwError = () => {
  throw new Error("Unexpected call");
};

/**
 * Mock the relevant `fs` and `os` functions to simulate a Windows environment.
 *
 * If non-windows, mock `path.dirname` and `path.basename` to use Windows-style slashes.
 */
export function doWindowsMocks(options?: {
  /** If true, mocks except `os.platform()` will throw. Used to verify no mocks are called. */
  throw?: boolean;
}): {
  spawnSync: jest.SpiedFunction<typeof child_process.spawnSync>;
  existsSync: jest.SpiedFunction<typeof fs.existsSync>;
  realpathSync: jest.SpiedFunction<typeof fs.realpathSync>;
  statSync: jest.SpiedFunction<typeof fs.statSync>;
  homedir: jest.SpiedFunction<typeof os.homedir>;
  platform: jest.SpiedFunction<typeof os.platform>;
  tmpdir: jest.SpiedFunction<typeof os.tmpdir>;
} {
  const shouldThrow = !!options?.throw;

  if (realOs.platform() !== "win32") {
    // mocking these on windows causes an infinite loop
    jest.spyOn(path, "dirname").mockImplementation(path.win32.dirname);
    jest.spyOn(path, "basename").mockImplementation(path.win32.basename);
  }

  return {
    spawnSync: jest.spyOn(child_process, "spawnSync").mockImplementation(throwError),
    existsSync: jest.spyOn(fs, "existsSync").mockImplementation(shouldThrow ? throwError : () => true),
    realpathSync: jest.spyOn(fs, "realpathSync").mockImplementation(shouldThrow ? throwError : noOp),
    statSync: jest.spyOn(fs, "statSync").mockImplementation(shouldThrow ? throwError : () => ({ ino: 1 }) as any),
    homedir: jest.spyOn(os, "homedir").mockImplementation(shouldThrow ? throwError : () => paths.homeDir),
    platform: jest.spyOn(os, "platform").mockImplementation(() => "win32"),
    tmpdir: jest.spyOn(os, "tmpdir").mockImplementation(shouldThrow ? throwError : () => paths.shortTemp),
  };
}

/**
 * Remove a temp directory, ignoring errors.
 * (This can't be imported from `@lage-run/test-utilities` to avoid a circular dependency.)
 */
export function removeTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
