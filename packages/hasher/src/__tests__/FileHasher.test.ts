import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
import { createHash } from "crypto";
import fs from "graceful-fs";
import path from "path";
import type * as GlobHasher from "glob-hasher";
import type * as FileHasherModule from "../FileHasher.js";

jest.mock("glob-hasher", () => {
  const actual = jest.requireActual<typeof GlobHasher>("glob-hasher");
  return { ...actual, hash: jest.fn(actual.hash), stat: jest.fn(actual.stat) };
});

// Load after registering the mock: SWC does not hoist imported jest.mock calls.
const native = jest.requireActual<typeof GlobHasher>("glob-hasher");
const { hash, stat } = jest.requireMock<typeof GlobHasher>("glob-hasher");
const { FileHasher } = jest.requireActual<typeof FileHasherModule>("../FileHasher.js");

describe("FileHasher", () => {
  let root: string;

  beforeEach(() => {
    root = createTempDir();
    jest.mocked(hash).mockReset().mockImplementation(native.hash);
    jest.mocked(stat).mockReset().mockImplementation(native.stat);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    removeTempDir(root);
  });

  function gitHash(content: string | Buffer) {
    const bytes = Buffer.from(content);
    return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  }

  it("skips filesystem work for empty inputs", () => {
    const statSync = jest.spyOn(fs, "statSync");
    const hasher = new FileHasher({ root });

    expect(hasher.hash([])).toEqual({});
    expect(stat).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(statSync).not.toHaveBeenCalled();
  });

  it("reuses hashes and metadata without a second stat, including after manifest reload", async () => {
    const file = "space name.txt";
    fs.writeFileSync(path.join(root, file), "first\r\n");
    const statSync = jest.spyOn(fs, "statSync");
    const hasher = new FileHasher({ root });
    const expected = { [file]: gitHash("first\n") };

    expect(hasher.hash([file])).toEqual(expected);
    expect(statSync).not.toHaveBeenCalled();
    expect(hasher.hash([file])).toEqual(expected);
    expect(hash).toHaveBeenCalledTimes(1);
    expect(stat).toHaveBeenCalledTimes(2);
    hasher.writeManifest();

    const nextHasher = new FileHasher({ root });
    await nextHasher.readManifest();

    expect(nextHasher.hash([file])).toEqual(expected);
    expect(hash).toHaveBeenCalledTimes(1);
    expect(stat).toHaveBeenCalledTimes(3);
  });

  it.each(["mtime", "size"])("rehashes only files with changed %s", (change) => {
    const file = "changed.txt";
    const filePath = path.join(root, file);
    const originalTime = new Date("2020-01-01T00:00:00Z");
    fs.writeFileSync(filePath, "first");
    fs.utimesSync(filePath, originalTime, originalTime);
    fs.writeFileSync(path.join(root, "unchanged.txt"), "unchanged");
    const hasher = new FileHasher({ root });
    const files = [file, "unchanged.txt"];
    hasher.hash(files);

    const content = change === "mtime" ? "other" : "longer content";
    const changedTime = change === "mtime" ? new Date("2020-01-02T00:00:00Z") : originalTime;
    fs.writeFileSync(filePath, content);
    fs.utimesSync(filePath, changedTime, changedTime);
    jest.mocked(hash).mockClear();

    expect(hasher.hash(files)).toEqual({ [file]: gitHash(content), "unchanged.txt": gitHash("unchanged") });
    expect(hash).toHaveBeenCalledTimes(1);
    expect(hash).toHaveBeenCalledWith([file], { cwd: root, concurrency: 4 });
  });

  it("preserves binary hashes and normalized keys for absolute inputs", () => {
    const content = Buffer.from("binary\0\r\n");
    const file = "binary.dat";
    fs.writeFileSync(path.join(root, file), content);
    const hasher = new FileHasher({ root });

    expect(hasher.hash([path.join(root, file)])).toEqual({ [file]: gitHash(content) });
    expect(hasher.hash([file])).toEqual({ [file]: gitHash(content) });
    expect(hash).toHaveBeenCalledTimes(1);
  });

  it("detects edits made after content is read instead of caching an old hash with new metadata", () => {
    const file = "input.txt";
    const filePath = path.join(root, file);
    const originalTime = new Date("2020-01-01T00:00:00Z");
    fs.writeFileSync(filePath, "first");
    fs.utimesSync(filePath, originalTime, originalTime);
    jest.mocked(hash).mockImplementationOnce((files, options) => {
      const hashes = native.hash(files, options);
      fs.writeFileSync(filePath, "other");
      const changedTime = new Date("2020-01-02T00:00:00Z");
      fs.utimesSync(filePath, changedTime, changedTime);
      return hashes;
    });
    const hasher = new FileHasher({ root });

    expect(hasher.hash([file])).toEqual({ [file]: gitHash("first") });
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("other") });
    expect(hash).toHaveBeenCalledTimes(2);
  });

  it("does not cache a file that appears after metadata collection", () => {
    const file = "new.txt";
    jest.mocked(stat).mockImplementationOnce((files, options) => {
      const stats = native.stat(files, options);
      fs.writeFileSync(path.join(root, file), "new");
      return stats;
    });
    const hasher = new FileHasher({ root });

    expect(hasher.hash([file])).toEqual({ [file]: gitHash("new") });
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("new") });
    expect(hash).toHaveBeenCalledTimes(2);
  });

  it("rejects deleted inputs and invalidates their stored hashes before recreation", () => {
    const file = "deleted.txt";
    const filePath = path.join(root, file);
    const originalTime = new Date("2020-01-01T00:00:00Z");
    fs.writeFileSync(filePath, "first");
    fs.utimesSync(filePath, originalTime, originalTime);
    const hasher = new FileHasher({ root });
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("first") });

    fs.unlinkSync(filePath);
    expect(() => hasher.hash([file])).toThrow();
    expect(hasher.hash([])).toEqual({});

    fs.writeFileSync(filePath, "other");
    fs.utimesSync(filePath, originalTime, originalTime);
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("other") });
  });

  it("rejects files deleted between metadata collection and hashing", () => {
    const file = "deleted.txt";
    const filePath = path.join(root, file);
    fs.writeFileSync(filePath, "first");
    jest.mocked(hash).mockImplementationOnce((files, options) => {
      fs.unlinkSync(filePath);
      return native.hash(files, options);
    });
    const hasher = new FileHasher({ root });

    expect(() => hasher.hash([file])).toThrow();
    fs.writeFileSync(filePath, "other");
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("other") });
  });

  it.each([null, undefined])("rejects an unreadable file rather than caching a %s hash", (failedHash) => {
    const file = "input.txt";
    fs.writeFileSync(path.join(root, file), "content");
    jest.mocked(hash).mockReturnValueOnce({ [file]: failedHash });
    const hasher = new FileHasher({ root });

    expect(() => hasher.hash([file])).toThrow(`Failed to hash file "${file}"`);
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("content") });
  });

  it("surfaces a failed native hashing operation", () => {
    const file = "input.txt";
    fs.writeFileSync(path.join(root, file), "content");
    jest.mocked(hash).mockReturnValueOnce(null);
    const hasher = new FileHasher({ root });

    expect(() => hasher.hash([file])).toThrow("Failed to hash files");
  });

  it.each(["per-file", "batch", "throw"])("invalidates normalized keys after an absolute-path %s failure", (failure) => {
    const file = "nested/input.txt";
    const filePath = path.join(root, file);
    const originalTime = new Date("2020-01-01T00:00:00Z");
    fs.mkdirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, "first");
    fs.utimesSync(filePath, originalTime, originalTime);
    const hasher = new FileHasher({ root });
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("first") });

    fs.writeFileSync(filePath, "other");
    const changedTime = new Date("2020-01-02T00:00:00Z");
    fs.utimesSync(filePath, changedTime, changedTime);
    if (failure === "throw") {
      jest.mocked(hash).mockImplementationOnce(() => {
        throw new Error("Native hashing failed");
      });
    } else {
      // Fail before processing the second native result, whose key is root-relative.
      jest.mocked(hash).mockReturnValueOnce(failure === "batch" ? null : { "failed.txt": null, [file]: gitHash("other") });
    }
    expect(() => hasher.hash([path.join(root, "failed.txt"), filePath])).toThrow();

    fs.utimesSync(filePath, originalTime, originalTime);
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("other") });
  });

  it.each(["directory", "directory link"])("ignores a %s input without ignoring regular files", (kind) => {
    const directory = path.join(root, "directory");
    fs.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, "child.txt"), "not an input");
    let input = "directory";
    if (kind === "directory link") {
      input = "link";
      fs.symlinkSync(directory, path.join(root, input), process.platform === "win32" ? "junction" : "dir");
    }
    fs.writeFileSync(path.join(root, "input.txt"), "content");
    const hasher = new FileHasher({ root });

    expect(hasher.hash([input, "input.txt"])).toEqual({ "input.txt": gitHash("content") });
    expect(hasher.hash([input])).toEqual({});
  });
});
