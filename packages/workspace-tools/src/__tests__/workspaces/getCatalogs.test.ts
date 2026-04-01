import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture, fixturesRoot, type TestFixtureName } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { getPackageInfo } from "../../getPackageInfo.js";
import type { Catalogs } from "../../types/Catalogs.js";
import type { WorkspaceManager } from "../../types/WorkspaceManager.js";
import { catalogsToYaml } from "../../workspaces/catalogsToYaml.js";
import { getCatalogs } from "../../workspaces/getCatalogs.js";
import { getWorkspaceManagerAndRoot } from "../../workspaces/implementations/index.js";
import { managerFiles } from "../../workspaces/implementations/getWorkspaceManagerAndRoot.js";

// Samples from https://yarnpkg.com/features/catalogs
const defaultCatalogs: Required<Pick<Catalogs, "default">> = {
  default: {
    react: "^18.2.0",
    lodash: "^4.17.21",
  },
};

const namedCatalogs: Required<Catalogs> = {
  named: {
    react17: {
      react: "^17.0.2",
      "react-dom": "^17.0.2",
    },
    react18: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
    },
  },
  default: {
    lodash: "^4.17.21",
  },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lernaJson = require(path.join(fixturesRoot, "lerna.base.json"));

describe("getCatalogs", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  describe("unsupported managers", () => {
    // Test unsupported managers first
    it.each<{ manager: string; fixtureName: TestFixtureName }>([
      { manager: "npm", fixtureName: "monorepo-basic-npm" },
      { manager: "rush", fixtureName: "monorepo-rush-pnpm" },
    ])("returns undefined for $manager monorepo", ({ manager, fixtureName }) => {
      const fixturePath = setupFixture(fixtureName);
      // verify manager detection
      expect(getWorkspaceManagerAndRoot(fixturePath)).toEqual({ manager, root: fixturePath });

      const catalogs = getCatalogs(fixturePath);
      expect(catalogs).toBeUndefined();
    });
  });

  describe.each<{
    name: string;
    manager: WorkspaceManager;
    // The repo and catalog file format is different per manager, but the other test logic is reused
    baseFixture: TestFixtureName;
    /** Write the catalogs to disk in manager-specific format */
    writeCatalogs: (root: string, catalogs: Catalogs) => void;
  }>([
    {
      name: "pnpm",
      manager: "pnpm",
      baseFixture: "monorepo-basic-pnpm",
      writeCatalogs: (root, catalogs) => {
        // https://pnpm.io/catalogs
        const pnpmWorkspacePath = path.join(root, managerFiles.pnpm);
        fs.appendFileSync(pnpmWorkspacePath, `\n${catalogsToYaml(catalogs)}\n`);
      },
    },
    {
      name: "yarn v4",
      manager: "yarn",
      baseFixture: "monorepo-basic-yarn-berry",
      writeCatalogs: (root, catalogs) => {
        // https://yarnpkg.com/features/catalogs
        const yarnrcPath = path.join(root, ".yarnrc.yml");
        fs.appendFileSync(yarnrcPath, `\n${catalogsToYaml(catalogs)}\n`);
      },
    },
    {
      name: "midgard-yarn-strict",
      manager: "yarn",
      baseFixture: "monorepo-basic-yarn-1",
      writeCatalogs: (root, catalogs) => {
        const { packageJsonPath, ...packageJson } = getPackageInfo(root)!;
        const workspacePackages = Array.isArray(packageJson.workspaces)
          ? packageJson.workspaces
          : packageJson.workspaces?.packages || [];
        packageJson.workspaces = { packages: workspacePackages };
        const { named, default: defaultCatalog } = catalogs;
        defaultCatalog && (packageJson.workspaces.catalog = defaultCatalog);
        named && (packageJson.workspaces.catalogs = named);
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      },
    },
  ])("$name", ({ name, manager, baseFixture, writeCatalogs }) => {
    let fixturePath = "";
    let lernaFixturePath = "";

    beforeEach(() => {
      fixturePath = setupFixture(baseFixture);
      expect(getWorkspaceManagerAndRoot(fixturePath)).toEqual({ manager, root: fixturePath });

      lernaFixturePath = setupFixture(baseFixture);
      fs.writeFileSync(
        path.join(lernaFixturePath, managerFiles.lerna),
        JSON.stringify({ ...lernaJson, npmClient: manager })
      );
    });

    it("returns undefined if no catalogs", () => {
      const catalogs = getCatalogs(fixturePath);
      expect(catalogs).toBeUndefined();
    });

    it("returns default catalogs if defined alone", () => {
      writeCatalogs(fixturePath, defaultCatalogs);

      const catalogs = getCatalogs(fixturePath);
      expect(catalogs).toEqual(defaultCatalogs);
    });

    it("returns named catalogs if defined alone", () => {
      writeCatalogs(fixturePath, { named: namedCatalogs.named });

      const catalogs = getCatalogs(fixturePath);
      expect(catalogs).toEqual({ named: namedCatalogs.named });
    });

    it("returns both default and named catalogs if both defined", () => {
      writeCatalogs(fixturePath, namedCatalogs);

      const catalogs = getCatalogs(fixturePath);
      expect(catalogs).toEqual(namedCatalogs);
    });

    it('handles a catalog named "default"', () => {
      // Different managers have different behavior here...
      const catalogNamedDefault: Catalogs = {
        named: {
          default: { lodash: "^4.17.21" },
        },
      };
      writeCatalogs(fixturePath, catalogNamedDefault);

      const catalogs = getCatalogs(fixturePath);
      if (name === "yarn v4") {
        expect(catalogs).toEqual({
          named: { default: { lodash: "^4.17.21" } },
        });
      } else {
        expect(catalogs).toEqual({
          default: { lodash: "^4.17.21" },
        });
      }
    });

    // The manager will be detected as lerna, so the lerna implementation must have logic to
    // fall back to the actual manager implementation to read catalogs.
    it("returns catalogs in a monorepo with lerna", () => {
      writeCatalogs(lernaFixturePath, defaultCatalogs);
      expect(getWorkspaceManagerAndRoot(lernaFixturePath)).toEqual({ manager: "lerna", root: lernaFixturePath });

      const catalogs = getCatalogs(lernaFixturePath);
      expect(catalogs).toEqual(defaultCatalogs);
    });
  });
});
