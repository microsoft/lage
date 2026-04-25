import { describe, expect, it } from "@jest/globals";
import type { Catalogs } from "../../types/Catalogs.js";
import { catalogsToYaml } from "../../workspaces/catalogsToYaml.js";
import { parseCatalogContent } from "../../workspaces/parseCatalogContent.js";
import type { PackageInfo } from "../../types/PackageInfo.js";

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

describe("parseCatalogContent", () => {
  describe.each<{
    name: string;
    manager: "pnpm" | "yarn";
    /** Format the catalog fixture as a string */
    stringifyCatalogs: (catalogs: Catalogs) => string;
  }>([
    {
      name: "pnpm",
      manager: "pnpm",
      stringifyCatalogs: catalogsToYaml,
    },
    {
      name: "yarn v4",
      manager: "yarn",
      stringifyCatalogs: catalogsToYaml,
    },
    {
      name: "midgard-yarn-strict",
      manager: "yarn",
      stringifyCatalogs: (catalogs) => {
        const packageJson = {} as PackageInfo;
        packageJson.workspaces = { packages: ["packages/*"] };
        const { named, default: defaultCatalog } = catalogs;
        defaultCatalog && (packageJson.workspaces.catalog = defaultCatalog);
        named && (packageJson.workspaces.catalogs = named);
        return JSON.stringify(packageJson, null, 2);
      },
    },
  ])("$name", ({ name, manager, stringifyCatalogs }) => {
    it("returns undefined if no catalogs", () => {
      const content = stringifyCatalogs({});
      const catalogs = parseCatalogContent(content, manager);
      expect(catalogs).toBeUndefined();
    });

    it("returns default catalogs if defined alone", () => {
      const content = stringifyCatalogs(defaultCatalogs);
      const catalogs = parseCatalogContent(content, manager);
      expect(catalogs).toEqual(defaultCatalogs);
    });

    it("returns named catalogs if defined alone", () => {
      const content = stringifyCatalogs({ named: namedCatalogs.named });
      const catalogs = parseCatalogContent(content, manager);
      expect(catalogs).toEqual({ named: namedCatalogs.named });
    });

    it("returns both default and named catalogs if both defined", () => {
      const content = stringifyCatalogs(namedCatalogs);
      const catalogs = parseCatalogContent(content, manager);
      expect(catalogs).toEqual(namedCatalogs);
    });

    it('handles a catalog named "default"', () => {
      // Different managers have different behavior here...
      const catalogNamedDefault: Catalogs = {
        named: {
          default: { lodash: "^4.17.21" },
        },
      };
      const content = stringifyCatalogs(catalogNamedDefault);

      const catalogs = parseCatalogContent(content, manager);
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
  });
});
