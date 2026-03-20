import path from "path";
import fs from "fs-extra";
import execa from "execa";

import { setupFixture } from "@lage-run/test-utilities";

import { findPathToBackfill } from "./helper.js";

describe("End to end", () => {
  let pathToBackfill: string;
  let hashPath: string;

  beforeAll(async () => {
    pathToBackfill = await findPathToBackfill();
    hashPath = path.join("node_modules", ".cache", "backfill");
  });

  it("works", async () => {
    const packageRoot = await setupFixture("basic");

    await execa("node", [pathToBackfill, "--", "npm run compile"], {
      cwd: packageRoot,
    });

    // Verify it produces the correct hash
    const ownHash = fs.readdirSync(path.join(packageRoot, hashPath));
    expect(ownHash).toContain("bd773dfb416fdbf46e6cb3defd061f514f3cbb45");

    // ... and that `npm run compile` was run successfully
    const libFolderExist = await fs.pathExists(path.join(packageRoot, "lib"));
    expect(libFolderExist).toBe(true);
  });

  it("fails on error with error code 1", async () => {
    const packageRoot = await setupFixture("basic");

    const execProcess = execa("node", [pathToBackfill, "--", "somecommand"], {
      cwd: packageRoot,
    });

    let done: () => void;
    const donePromise = new Promise<void>((resolve) => {
      done = resolve;
    });
    void execProcess.on("exit", (code) => {
      expect(code).toBe(1);
      done();
    });
    await donePromise;
  });
});
