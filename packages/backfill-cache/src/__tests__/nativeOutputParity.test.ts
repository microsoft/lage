import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import fs from "fs";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import path from "path";
import { performance } from "perf_hooks";
import { makeLogger } from "backfill-logger";
import { createTempDir, removeTempDirAsync } from "@lage-run/test-utilities";
import {
  getNativeOutputValidator,
  type NativeOutputValidator,
} from "../nativeOutputValidator.js";

const binary = path.resolve(
  __dirname,
  "..",
  "..",
  "lib",
  "native",
  `cache-validator-${process.platform}-${process.arch}.node`
);
const loadNative = createRequire(__filename);

function fingerprint(filename: string): string {
  const stat = fs.lstatSync(filename, { bigint: true });
  return `${stat.dev}:${stat.ino}:${stat.mode}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
}

describe("native output validation against Node metadata", () => {
  if (!fs.existsSync(binary)) {
    it("keeps the portable fallback available without a native build", () => {
      // A forced native test run still fails here when its binary is missing.
      expect(getNativeOutputValidator(makeLogger("mute"))).toBeUndefined();
    });
    return;
  }

  let root: string;
  let validate: NativeOutputValidator;

  beforeEach(() => {
    root = createTempDir({ prefix: "lage-native-parity-" });
    const addon: {
      apiVersion: number;
      validateOutputs: NativeOutputValidator;
    } = loadNative(binary);
    expect(addon.apiVersion).toBe(1);
    expect(typeof addon.validateOutputs).toBe("function");
    validate = addon.validateOutputs;
  });

  afterEach(async () => {
    await removeTempDirAsync(root, { throwOnError: true, maxAttempts: 3 });
  });

  function write(relative: string, contents = "original"): string {
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, contents);
    return filename;
  }

  it("matches Node BigIntStats for empty, normal, Unicode and long paths", async () => {
    const paths = [
      "empty.txt",
      "normal.txt",
      "nested/space and \u96ea.txt",
      `${"long-directory/".repeat(24)}output.txt`,
    ];
    const files = paths.map((relative, index) =>
      write(relative, index === 0 ? "" : "content")
    );

    const fingerprints = files.map(fingerprint);
    const pending = validate(root, paths, fingerprints);
    expect(typeof pending.then).toBe("function");
    await expect(pending).resolves.toBe(true);
    await expect(
      validate(path.relative(process.cwd(), root), paths, fingerprints)
    ).resolves.toBe(true);
    await expect(validate(`${root}\0`, paths, fingerprints)).rejects.toThrow();
    await expect(validate(root, paths, [])).resolves.toBe(false);
    await expect(validate(root, [], [])).resolves.toBe(true);
  });

  it("detects ctime changes when size and modification time are preserved", async () => {
    const filename = write("output.txt");
    const originalTime = new Date("2001-02-03T04:05:06.789Z");
    fs.utimesSync(filename, originalTime, originalTime);
    const before = fs.lstatSync(filename, { bigint: true });
    const expected = fingerprint(filename);

    // Windows can give consecutive writes the same timestamp. Establish a real
    // metadata change rather than expecting the validator to compare contents.
    const deadline = performance.now() + 2000;
    let after = before;
    do {
      fs.writeFileSync(filename, "modified");
      fs.utimesSync(filename, originalTime, originalTime);
      after = fs.lstatSync(filename, { bigint: true });
      if (after.ctimeNs !== before.ctimeNs) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    } while (performance.now() < deadline);

    expect(after.size).toBe(before.size);
    expect(after.mtimeNs).toBe(before.mtimeNs);
    expect(after.ctimeNs).not.toBe(before.ctimeNs);
    await expect(validate(root, ["output.txt"], [expected])).resolves.toBe(
      false
    );
  });

  it("detects deletion, directory replacement and file identity changes", async () => {
    const filename = write("output.txt");
    const expected = fingerprint(filename);
    fs.renameSync(filename, path.join(root, "previous.txt"));

    await expect(validate(root, ["output.txt"], [expected])).resolves.toBe(
      false
    );
    fs.mkdirSync(filename);
    await expect(
      validate(root, ["output.txt"], [fingerprint(filename)])
    ).resolves.toBe(false);

    fs.rmdirSync(filename);
    write("output.txt");
    await expect(validate(root, ["output.txt"], [expected])).resolves.toBe(
      false
    );
    await expect(
      validate(root, ["output.txt"], [fingerprint(filename)])
    ).resolves.toBe(true);
  });

  it("preserves readonly file attributes and detects attribute changes", async () => {
    const filename = write("readonly.txt");
    fs.chmodSync(filename, 0o444);
    const expected = fingerprint(filename);

    await expect(validate(root, ["readonly.txt"], [expected])).resolves.toBe(
      true
    );
    fs.chmodSync(filename, 0o666);
    await expect(validate(root, ["readonly.txt"], [expected])).resolves.toBe(
      false
    );
  });

  it("does not follow live or dangling file symlinks", async () => {
    const filename = write("target.txt");
    const link = path.join(root, "link.txt");
    fs.symlinkSync(filename, link, "file");
    const targetFingerprint = fingerprint(filename);

    await expect(
      validate(root, ["link.txt"], [targetFingerprint])
    ).resolves.toBe(false);
    await expect(
      validate(root, ["link.txt"], [fingerprint(link)])
    ).resolves.toBe(false);
    fs.unlinkSync(filename);
    await expect(
      validate(root, ["link.txt"], [targetFingerprint])
    ).resolves.toBe(false);
  });

  it("compares every fingerprint field", async () => {
    const filename = write("output.txt");
    const fields = fingerprint(filename).split(":");
    for (let index = 0; index < fields.length; index++) {
      const changed = [...fields];
      changed[index] = (BigInt(changed[index]) + 1n).toString();
      await expect(
        validate(root, ["output.txt"], [changed.join(":")])
      ).resolves.toBe(false);
    }
  });

  it("rejects unsafe paths and malformed fingerprints", async () => {
    const filename = write("output.txt");
    const expected = fingerprint(filename);
    for (const relative of [
      "",
      "../output.txt",
      "nested/../../output.txt",
      "..\\output.txt",
      "/output.txt",
      "C:\\output.txt",
      "output.txt:stream",
      "output\0.txt",
    ]) {
      await expect(validate(root, [relative], [expected])).resolves.toBe(false);
    }
    for (const invalid of ["", "invalid", `${expected}:0`, `0${expected}`]) {
      await expect(validate(root, ["output.txt"], [invalid])).resolves.toBe(
        false
      );
    }
  });

  it("matches metadata across large and concurrent batches", async () => {
    const files = Array.from({ length: 1100 }, (_, index) =>
      write(`outputs/${index}.txt`, `${index}`)
    );
    const relative = files.map((file) => path.relative(root, file));
    const expected = files.map(fingerprint);

    await expect(validate(root, relative, expected)).resolves.toBe(true);
    const concurrent = await Promise.all(
      Array.from({ length: 270 }, () =>
        validate(root, relative.slice(0, 2), expected.slice(0, 2))
      )
    );
    expect(concurrent.every(Boolean)).toBe(true);

    fs.unlinkSync(files[1024]);
    await expect(validate(root, relative, expected)).resolves.toBe(false);
  });

  it("survives repeated Worker-only loading and environment teardown", () => {
    const script = path.resolve(
      __dirname,
      "..",
      "..",
      "native",
      "tests",
      "worker-lifecycle.cjs"
    );
    const result = spawnSync(process.execPath, [script, binary], {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        `Native Worker lifecycle failed (${result.signal ?? result.status}):\n${result.stdout}\n${result.stderr}`
      );
    }
  }, 70_000);
});
