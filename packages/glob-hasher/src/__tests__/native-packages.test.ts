import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { isCI } from "@lage-run/monorepo-scripts/isCI.js";
import { hostTarget, nativeTargets } from "@lage-run/monorepo-scripts/rust/constants.js";
import fastGlob from "fast-glob";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type * as GlobHasher from "../../index.js";

const host = hostTarget().suffix;
// Native matrix jobs set this because only one target's artifacts exist.
// Without it, CI requires all assembled artifacts; local runs check only the host.
const requestedTarget = process.env.GLOB_HASHER_TEST_TARGET;

if (requestedTarget && !nativeTargets.some(({ triple }) => triple === requestedTarget)) {
  throw new Error(`Unknown native test target: ${requestedTarget}`);
}

for (const { triple, suffix } of nativeTargets) {
  const isTargetIncluded = requestedTarget ? triple === requestedTarget : isCI() || suffix === host;
  // eslint-disable-next-line no-restricted-properties -- Other platforms are intentionally visible as skipped suites.
  const describeTarget = isTargetIncluded ? describe : describe.skip;

  describeTarget(`${triple} native package`, () => {
    const targetPackageDir = path.resolve(__dirname, "../../../glob-hasher-native", `glob-hasher-${suffix}`);

    it("includes the existing built files in its package file list", () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(targetPackageDir, "package.json"), "utf8")) as {
        main: string;
        files: string[];
      };
      expect(Array.isArray(manifest.files)).toBe(true);
      expect(manifest.files.length).toBeGreaterThan(0);
      const included = manifest.files.flatMap((pattern) => {
        const matched = fastGlob.sync(pattern, { cwd: targetPackageDir });
        expect(matched.length).toBeGreaterThan(0);
        return matched;
      });
      const built = fastGlob.sync("*.node", { cwd: targetPackageDir });
      expect(built).toContain(manifest.main);
      expect(included).toEqual(expect.arrayContaining(built));
    });

    // eslint-disable-next-line no-restricted-properties
    const describeHost = suffix === host ? describe : describe.skip;
    describeHost("native APIs", () => {
      let tempDir: string | undefined;
      let globHasherBinding: typeof GlobHasher;
      const bytes = Buffer.from("native package smoke test\n");
      const expectedHash = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

      beforeAll(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `glob-hasher-${suffix}-test-`));
        // Bypass the wrapper so its adjacent build artifact cannot hide a missing platform-package binding.
        const requireFromPackage = createRequire(pathToFileURL(path.join(targetPackageDir, "package.json")));
        globHasherBinding = requireFromPackage("./");
        fs.writeFileSync(path.join(tempDir, "file.txt"), bytes);
      });

      afterAll(() => {
        tempDir && fs.rmSync(tempDir, { recursive: true, force: true });
        tempDir = undefined;
      });

      it("hash returns Git hashes and null for missing files", () => {
        expect(globHasherBinding.hash(["file.txt", "missing.txt"], { cwd: tempDir })).toEqual({
          "file.txt": expectedHash,
          "missing.txt": null,
        });
      });

      it("hashGlobGit returns Git hashes for matching files", () => {
        expect(globHasherBinding.hashGlobGit(["*.txt"], { cwd: tempDir })).toEqual({ "file.txt": expectedHash });
      });

      it("hashGlobXxhash returns bigint hashes for matching files", () => {
        expect(typeof globHasherBinding.hashGlobXxhash(["*.txt"], { cwd: tempDir })?.["file.txt"]).toBe("bigint");
      });

      it("glob returns matching paths", () => {
        expect(globHasherBinding.glob(["*.txt"], { cwd: tempDir })?.map((file) => path.basename(file))).toEqual(["file.txt"]);
      });

      it("stat returns file size and bigint modification time", () => {
        const stats = globHasherBinding.stat(["file.txt"], { cwd: tempDir });
        expect(stats?.["file.txt"].size).toBe(bytes.length);
        expect(typeof stats?.["file.txt"].mtime).toBe("bigint");
      });
    });
  });
}
