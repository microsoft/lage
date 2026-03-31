import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { getPackagesByFiles } from "../../workspaces/getPackagesByFiles.js";

describe("getPackagesByFiles", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("can find all packages that contain the files in a monorepo", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");

    const packages = getPackagesByFiles({ root, files: ["packages/package-a/footest.txt"] });

    expect(packages).toEqual(["package-a"]);
  });

  it("can find can ignore changes in a glob pattern", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const newFileA = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFileA, "hello foo test");

    const newFileB = path.join(root, "packages/package-b/footest.txt");
    fs.writeFileSync(newFileB, "hello foo test");

    const packages = getPackagesByFiles({
      root,
      files: ["packages/package-a/footest.txt", "packages/package-b/footest.txt"],
      ignoreGlobs: ["packages/package-b/**"],
    });
    expect(packages).toEqual(["package-a"]);
  });

  it("can find can handle empty files", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const packages = getPackagesByFiles({ root, files: [] });

    expect(packages).toEqual([]);
  });

  it("can find can handle unrelated files", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const packages = getPackagesByFiles({ root, files: ["package.json"] });

    expect(packages).toEqual([]);
  });
});
