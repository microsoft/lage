import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture, type TestFixtureName } from "../setupFixture.js";
import path from "path";
import type { WorkspaceManager } from "../../types/WorkspaceManager.js";
import { getWorkspaceInfos, getWorkspaceInfosAsync } from "../../workspaces/getWorkspaceInfos.js";
import { getWorkspaceManagerAndRoot } from "../../workspaces/implementations";

describe("getWorkspaceInfos", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  describe.each<{
    manager: WorkspaceManager;
    desc: string;
    fixtureName: TestFixtureName;
  }>([
    { manager: "yarn", desc: "yarn", fixtureName: "monorepo-basic-yarn-1" },
    { manager: "pnpm", desc: "pnpm", fixtureName: "monorepo-basic-pnpm" },
    { manager: "rush", desc: "rush + pnpm", fixtureName: "monorepo-rush-pnpm" },
    { manager: "rush", desc: "rush + yarn", fixtureName: "monorepo-rush-yarn" },
    { manager: "npm", desc: "npm", fixtureName: "monorepo-basic-npm" },
    { manager: "lerna", desc: "lerna + npm", fixtureName: "monorepo-basic-lerna-npm" },
    { manager: "lerna", desc: "lerna + yarn v1", fixtureName: "monorepo-basic-lerna-yarn-1" },
    { manager: "lerna", desc: "lerna + yarn berry", fixtureName: "monorepo-basic-lerna-yarn-berry" },
    { manager: "lerna", desc: "lerna + pnpm", fixtureName: "monorepo-basic-lerna-pnpm" },
  ])("$desc", ({ manager, fixtureName }) => {
    it.each(["sync", "async"] as const)("gets workspace info (%s)", async (syncAsync) => {
      const getInfo = syncAsync === "sync" ? getWorkspaceInfos : getWorkspaceInfosAsync;

      const root = setupFixture(fixtureName);
      expect(getWorkspaceManagerAndRoot(root, new Map())).toEqual({ manager, root });

      const workspacesPackageInfo = (await getInfo(root, manager))?.sort((a, b) => a.name.localeCompare(b.name));

      expect(workspacesPackageInfo).toEqual([
        {
          name: "individual",
          path: path.join(root, "individual"),
          packageJson: expect.objectContaining({ name: "individual" }),
        },
        {
          name: "package-a",
          path: path.join(root, "packages/package-a"),
          packageJson: expect.objectContaining({ name: "package-a" }),
        },
        {
          name: "package-b",
          path: path.join(root, "packages/package-b"),
          packageJson: expect.objectContaining({ name: "package-b" }),
        },
      ]);
    });
  });
});
