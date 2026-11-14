import { describe, it, expect } from "@jest/globals";
import path from "path";
import fs from "fs";
import os from "os";
import { hash, hashGlobGit, hashGlobXxhash, glob, stat } from "../../index.js";

const fixtures = path.resolve(__dirname, "fixtures");

function sortObject<T>(unordered: Record<string, T> | null): Record<string, T> {
  if (!unordered) {
    throw new Error("Expected a hash map");
  }
  return Object.fromEntries(Object.entries(unordered).sort(([a], [b]) => a.localeCompare(b)));
}

describe("hash glob xxhash", () => {
  it("should calculate the hash in parallel consistently", () => {
    const map = hashGlobXxhash(["a.*"], {
      cwd: fixtures,
      concurrency: 200,
    });

    expect(sortObject(map)).toEqual({
      "a.json": 11810798349410098695n,
      "a.png": 4573747350076585403n,
      "a.txt": 13554666155361377856n,
    });
  });

  it("should calculate the hash of both positive and negative match globs", () => {
    const map = hashGlobXxhash(["*.*", "!b.*"], {
      cwd: fixtures,
      concurrency: 200,
    });

    expect(sortObject(map)).toEqual({
      ".hiddenfile": 9323281055126355666n,
      "a.json": 11810798349410098695n,
      "a.png": 4573747350076585403n,
      "a.txt": 13554666155361377856n,
    });
  });

  it("should calculate the hash of dot files", () => {
    const map = hashGlobXxhash([], {
      cwd: fixtures,
      concurrency: 200,
    });

    expect(sortObject(map)).toEqual({
      ".hiddenfile": 9323281055126355666n,
      "a.json": 11810798349410098695n,
      "a.png": 4573747350076585403n,
      "a.txt": 13554666155361377856n,
      "b.txt": 11083092647103983954n,
    });
  });
});

describe("hash", () => {
  it("should not panic when hashing a non-existent file", () => {
    expect(hash(["non-existent-file"])).toEqual({
      "non-existent-file": null,
    });
  });
});

describe("hash glob git hash", () => {
  it("should not panic when hashing a non-existent file", () => {
    expect(hashGlobGit(["non-existent-file"])).toEqual({});
  });

  it("should calculate the hash in parallel consistently", () => {
    const map = hashGlobGit(["a.*"], {
      cwd: fixtures,
      concurrency: 200,
    });

    expect(sortObject(map)).toEqual({
      "a.json": "3beeaadf5184e547dcb1ea3dfff12a833374a5ee",
      "a.png": "8706631f7a41695ed2160ad081a6c45ac0f080ba",
      "a.txt": "12563d0af099d19e60f89bc6ff327d01b3bf2926",
    });
  });

  it("should calculate the hash of both positive and negative match globs", () => {
    const map = hashGlobGit(["*.*", "!b.*"], {
      cwd: fixtures,
      concurrency: 200,
    });

    expect(sortObject(map)).toEqual({
      ".hiddenfile": "45a6961f4815da29087b3b68d97400a4376d80d6",
      "a.json": "3beeaadf5184e547dcb1ea3dfff12a833374a5ee",
      "a.png": "8706631f7a41695ed2160ad081a6c45ac0f080ba",
      "a.txt": "12563d0af099d19e60f89bc6ff327d01b3bf2926",
    });
  });

  it("should calculate the hash of dot files", () => {
    const map = hashGlobGit([], {
      cwd: fixtures,
      concurrency: 200,
    });

    expect(sortObject(map)).toEqual({
      ".hiddenfile": "45a6961f4815da29087b3b68d97400a4376d80d6",
      "a.json": "3beeaadf5184e547dcb1ea3dfff12a833374a5ee",
      "a.png": "8706631f7a41695ed2160ad081a6c45ac0f080ba",
      "a.txt": "12563d0af099d19e60f89bc6ff327d01b3bf2926",
      "b.txt": "8c39f112eff4bde989c74b6381ec75dffaa55c2a",
    });
  });
});

describe("native API compatibility", () => {
  it("normalizes line endings without changing binary contents", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "glob-hasher-"));
    try {
      fs.writeFileSync(path.join(cwd, "lf.txt"), "first\nsecond\n");
      fs.writeFileSync(path.join(cwd, "crlf.txt"), "first\r\nsecond\r\n");
      const binary = Buffer.from([0, 13, 10, 255]);
      fs.writeFileSync(path.join(cwd, "binary"), binary);
      const hashes = hash(["lf.txt", "crlf.txt", "binary"], { cwd });
      expect(hashes?.["lf.txt"]).toBe(hashes?.["crlf.txt"]);
      expect(hashes?.binary).toMatch(/^[a-f0-9]{40}$/);
      expect(fs.readFileSync(path.join(cwd, "binary"))).toEqual(binary);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("returns matching paths and bigint stat timestamps", () => {
    expect(
      glob(["a.*"], { cwd: fixtures })
        ?.map((file) => path.basename(file))
        .sort()
    ).toEqual(["a.json", "a.png", "a.txt"]);
    const result = stat(["a.txt", "missing"], { cwd: fixtures });
    expect(Object.keys(result ?? {})).toEqual(["a.txt"]);
    expect(result?.["a.txt"]).toEqual({
      mtime: BigInt(Math.trunc(fs.statSync(path.join(fixtures, "a.txt")).mtimeMs)),
      size: fs.statSync(path.join(fixtures, "a.txt")).size,
    });
  });
});
