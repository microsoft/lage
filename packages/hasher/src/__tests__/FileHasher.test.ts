import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createTempDir, removeTempDir } from "@lage-run/test-utilities";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import type * as GlobHasher from "glob-hasher";
import type * as FileHasherModule from "../FileHasher.js";

jest.mock("glob-hasher", () => {
  const actual = jest.requireActual<typeof GlobHasher>("glob-hasher");
  return { ...actual, hash: jest.fn(actual.hash), stat: jest.fn(actual.stat) };
});

const { hash, stat } = jest.requireMock<typeof GlobHasher>("glob-hasher");
const { FileHasher } = jest.requireActual<typeof FileHasherModule>("../FileHasher.js");

describe("FileHasher", () => {
  let fixtureRoot: string | undefined;

  afterEach(() => {
    removeTempDir(fixtureRoot);
    fixtureRoot = undefined;
  });

  function setup() {
    const root = createTempDir();
    fixtureRoot = root;
    return { root, hasher: new FileHasher({ root }) };
  }

  function gitHash(content: string | Buffer) {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  }

  it("skips native work for empty inputs", () => {
    const { hasher } = setup();
    expect(hasher.hash([])).toEqual({});
    expect(hash).not.toHaveBeenCalled();
    expect(stat).not.toHaveBeenCalled();
  });

  it("reuses hashes but checks metadata on every call, including after reloading the manifest", async () => {
    const { root, hasher } = setup();
    const file = "space 蝴蝶.txt";
    fs.writeFileSync(path.join(root, file), "first\r\n");
    const expected = { [file]: gitHash("first\n") };

    expect(hasher.hash([file])).toEqual(expected);
    expect(hasher.hash([file])).toEqual(expected);
    expect(hash).toHaveBeenCalledTimes(1);
    expect(stat).toHaveBeenCalledTimes(2);
    hasher.writeManifest();

    const nextHasher = new FileHasher({ root });
    await nextHasher.readManifest();
    expect(nextHasher.hash([file])).toEqual(expected);
    expect(hash).toHaveBeenCalledTimes(1);

    fs.writeFileSync(path.join(root, file), "other\r\n");
    const changedTime = new Date(Date.now() + 2000);
    fs.utimesSync(path.join(root, file), changedTime, changedTime);
    expect(nextHasher.hash([file])).toEqual({ [file]: gitHash("other\n") });
    expect(hash).toHaveBeenCalledTimes(2);
  });

  it("excludes deleted files and hashes recreated files", () => {
    const { root, hasher } = setup();
    const file = "input.txt";
    fs.writeFileSync(path.join(root, file), "first");
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("first") });

    fs.unlinkSync(path.join(root, file));
    expect(hasher.hash([file])).toEqual({});

    fs.writeFileSync(path.join(root, file), "second");
    expect(hasher.hash([file])).toEqual({ [file]: gitHash("second") });
  });

  it("preserves binary contents and accepts absolute input paths", () => {
    const { root, hasher } = setup();
    const content = Buffer.from("binary\0\r\n");
    fs.writeFileSync(path.join(root, "binary.dat"), content);

    expect(hasher.hash([path.join(root, "binary.dat")])).toEqual({ "binary.dat": gitHash(content) });
    expect(hasher.hash(["binary.dat"])).toEqual({ "binary.dat": gitHash(content) });
    expect(hash).toHaveBeenCalledTimes(1);
  });
});
