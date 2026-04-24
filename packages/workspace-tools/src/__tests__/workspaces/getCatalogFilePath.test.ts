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
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toBe("pnpm");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBe(path.join(fixturePath, managerFiles.pnpm));
  });

  it("returns .yarnrc.yml path for yarn v4", () => {
    const fixturePath = setupFixture("monorepo-basic-yarn-berry");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toBe("yarn");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBe(path.join(fixturePath, ".yarnrc.yml"));
  });

  it("returns package.json path for midgard-yarn-strict (yarn 1 without .yarnrc.yml)", () => {
    const fixturePath = setupFixture("monorepo-basic-yarn-1");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toBe("yarn");

    // Ensure .yarnrc.yml does not exist so it falls back to package.json
    const yarnrcPath = path.join(fixturePath, ".yarnrc.yml");
    expect(fs.existsSync(yarnrcPath)).toBe(false);

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBe(path.join(fixturePath, "package.json"));
  });

  it("returns undefined for npm", () => {
    const fixturePath = setupFixture("monorepo-basic-npm");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toBe("npm");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBeUndefined();
  });

  it("returns undefined for rush", () => {
    const fixturePath = setupFixture("monorepo-rush-pnpm");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toBe("rush");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBeUndefined();
  });

  it("returns catalog file path for lerna with yarn", () => {
    const fixturePath = setupFixture("monorepo-basic-lerna-yarn-berry");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toBe("lerna");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBe(path.join(fixturePath, ".yarnrc.yml"));
  });

  it("returns catalog file path for lerna with pnpm", () => {
    const fixturePath = setupFixture("monorepo-basic-lerna-pnpm");
    expect(getWorkspaceManagerAndRoot(fixturePath)?.manager).toBe("lerna");

    const result = getCatalogFilePath(fixturePath);
    expect(result).toBe(path.join(fixturePath, managerFiles.pnpm));
  });

  it("supports managerOverride", () => {
    const fixturePath = setupFixture("monorepo-basic-pnpm");

    const result = getCatalogFilePath(fixturePath, "pnpm");
    expect(result).toBe(path.join(fixturePath, managerFiles.pnpm));
  });
});
