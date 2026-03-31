import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture, type TestFixtureName } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import {
  getWorkspaceManagerAndRoot,
  managerFiles,
} from "../../workspaces/implementations/getWorkspaceManagerAndRoot.js";
import type { WorkspaceManager } from "../../types/WorkspaceManager.js";

describe("getWorkspaceManagerAndRoot", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it.each<{
    desc: string;
    manager: WorkspaceManager;
    fixtureName: TestFixtureName;
  }>([
    { desc: "yarn", manager: "yarn", fixtureName: "monorepo-basic-yarn-1" },
    { desc: "yarn berry", manager: "yarn", fixtureName: "monorepo-basic-yarn-berry" },
    { desc: "pnpm", manager: "pnpm", fixtureName: "monorepo-basic-pnpm" },
    { desc: "rush", manager: "rush", fixtureName: "monorepo-rush-pnpm" },
    { desc: "npm", manager: "npm", fixtureName: "monorepo-basic-npm" },
    { desc: "lerna + npm", manager: "lerna", fixtureName: "monorepo-basic-lerna-npm" },
    { desc: "lerna + yarn v1", manager: "lerna", fixtureName: "monorepo-basic-lerna-yarn-1" },
    { desc: "lerna + yarn berry", manager: "lerna", fixtureName: "monorepo-basic-lerna-yarn-berry" },
    { desc: "lerna + pnpm", manager: "lerna", fixtureName: "monorepo-basic-lerna-pnpm" },
  ])("handles $desc monorepo", ({ fixtureName, manager }) => {
    const repoRoot = setupFixture(fixtureName);
    expect(getWorkspaceManagerAndRoot(repoRoot)).toEqual({
      root: repoRoot,
      manager,
    });
  });

  it("searches up to find root", () => {
    const repoRoot = setupFixture("monorepo-basic-yarn-1");
    const startPath = path.join(repoRoot, "packages/package-a");
    expect(getWorkspaceManagerAndRoot(startPath)).toEqual({
      root: repoRoot,
      manager: "yarn",
    });
  });

  it("handles nested monorepo", () => {
    // This fixture has a monorepo under the "monorepo" folder, not at the git root.
    const repoRoot = setupFixture("monorepo-nested", { git: true });
    // Also make a fake lock file and fake package.json at the root to verify it stops
    // at the first one found.
    fs.writeFileSync(path.join(repoRoot, managerFiles.pnpm), "");
    fs.writeFileSync(
      path.join(repoRoot, "package.json"),
      JSON.stringify({ name: "repo-root", private: true, workspaces: [] })
    );

    // The root is the "monorepo" folder
    const startPath = path.join(repoRoot, "monorepo/packages/package-a");
    expect(getWorkspaceManagerAndRoot(startPath)).toEqual({
      root: path.join(repoRoot, "monorepo"),
      manager: "yarn",
    });
  });
});
