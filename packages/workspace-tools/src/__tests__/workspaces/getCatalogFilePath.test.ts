import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { getCatalogFilePath } from "../../workspaces/getCatalogFilePath.js";
import { getWorkspaceManagerAndRoot } from "../../workspaces/implementations/index.js";
import { managerFiles } from "../../workspaces/implementations/getWorkspaceManagerAndRoot.js";

describe("getCatalogFilePath", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("returns pnpm-workspace.yaml path for pnpm", () => {
    const fixturePath = setupFixture("monorepo-basic-pnpm");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toEqual("pnpm");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toEqual({ filePath: path.join(fixturePath, managerFiles.pnpm), manager: "pnpm" });
  });

  it("returns .yarnrc.yml path for yarn v4", () => {
    const fixturePath = setupFixture("monorepo-basic-yarn-berry");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toEqual("yarn");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toEqual({ filePath: path.join(fixturePath, ".yarnrc.yml"), manager: "yarn" });
  });

  it("returns package.json path for midgard-yarn-strict (yarn 1 without .yarnrc.yml)", () => {
    const fixturePath = setupFixture("monorepo-basic-yarn-1");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toEqual("yarn");

    // Ensure .yarnrc.yml does not exist so it falls back to package.json
    const yarnrcPath = path.join(fixturePath, ".yarnrc.yml");
    expect(fs.existsSync(yarnrcPath)).toEqual(false);

    const result = getCatalogFilePath(fixturePath);
    expect(result).toEqual({ filePath: path.join(fixturePath, "package.json"), manager: "yarn" });
  });

  it("returns undefined for npm", () => {
    const fixturePath = setupFixture("monorepo-basic-npm");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toEqual("npm");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBeUndefined();
  });

  it("returns undefined for rush", () => {
    const fixturePath = setupFixture("monorepo-rush-pnpm");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toEqual("rush");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBeUndefined();
  });

  it("returns catalog file path for lerna with yarn", () => {
    const fixturePath = setupFixture("monorepo-basic-lerna-yarn-berry");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toEqual("lerna");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toEqual({ filePath: path.join(fixturePath, ".yarnrc.yml"), manager: "yarn" });
  });

  it("returns catalog file path for lerna with pnpm", () => {
    const fixturePath = setupFixture("monorepo-basic-lerna-pnpm");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toEqual("lerna");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toEqual({ filePath: path.join(fixturePath, managerFiles.pnpm), manager: "pnpm" });
  });

  it("supports managerOverride", () => {
    const fixturePath = setupFixture("monorepo-basic-pnpm");

    const result = getCatalogFilePath(fixturePath, "pnpm");
    expect(result).toEqual({ filePath: path.join(fixturePath, managerFiles.pnpm), manager: "pnpm" });
  });
});
