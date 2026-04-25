import { describe, expect, it } from "@jest/globals";
import type { Catalogs } from "../../types/Catalogs.js";
import { catalogsToYaml } from "../../workspaces/catalogsToYaml.js";
import { parseCatalogContent } from "../../workspaces/parseCatalogContent.js";

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
  describe("pnpm", () => {
    it("parses default catalog from YAML", () => {
      const content = `packages:\n  - packages/*\n${catalogsToYaml(defaultCatalogs)}`;
      const result = parseCatalogContent(content, "pnpm");
      expect(result).toEqual(defaultCatalogs);
    });

    it("parses named catalogs from YAML", () => {
      const content = `packages:\n  - packages/*\n${catalogsToYaml({ named: namedCatalogs.named })}`;
      const result = parseCatalogContent(content, "pnpm");
      expect(result).toEqual({ named: namedCatalogs.named });
    });

    it("parses both default and named catalogs from YAML", () => {
      const content = `packages:\n  - packages/*\n${catalogsToYaml(namedCatalogs)}`;
      const result = parseCatalogContent(content, "pnpm");
      expect(result).toEqual(namedCatalogs);
    });

    it('treats a catalog named "default" as the default catalog', () => {
      const content = `packages:\n  - packages/*\ncatalogs:\n  default:\n    lodash: "^4.17.21"\n`;
      const result = parseCatalogContent(content, "pnpm");
      expect(result).toEqual({
        default: { lodash: "^4.17.21" },
      });
    });

    it("returns undefined if no catalogs are defined", () => {
      const content = `packages:\n  - packages/*\n`;
      const result = parseCatalogContent(content, "pnpm");
      expect(result).toBeUndefined();
    });
  });

  describe("yarn", () => {
    it("parses yarn v4 YAML catalog format", () => {
      const content = `nodeLinker: node-modules\n${catalogsToYaml(defaultCatalogs)}`;
      const result = parseCatalogContent(content, "yarn");
      expect(result).toEqual(defaultCatalogs);
    });

    it("parses yarn v4 YAML named catalogs", () => {
      const content = `nodeLinker: node-modules\n${catalogsToYaml(namedCatalogs)}`;
      const result = parseCatalogContent(content, "yarn");
      expect(result).toEqual(namedCatalogs);
    });

    it("parses midgard-yarn-strict JSON format with default catalog", () => {
      const packageJson = JSON.stringify({
        name: "test",
        workspaces: {
          packages: ["packages/*"],
          catalog: defaultCatalogs.default,
        },
      });
      const result = parseCatalogContent(packageJson, "yarn");
      expect(result).toEqual(defaultCatalogs);
    });

    it("parses midgard-yarn-strict JSON format with named catalogs", () => {
      const packageJson = JSON.stringify({
        name: "test",
        workspaces: {
          packages: ["packages/*"],
          catalogs: namedCatalogs.named,
          catalog: namedCatalogs.default,
        },
      });
      const result = parseCatalogContent(packageJson, "yarn");
      expect(result).toEqual(namedCatalogs);
    });

    it('handles midgard-yarn-strict catalog named "default"', () => {
      const packageJson = JSON.stringify({
        name: "test",
        workspaces: {
          packages: ["packages/*"],
          catalogs: {
            default: { lodash: "^4.17.21" },
          },
        },
      });
      const result = parseCatalogContent(packageJson, "yarn");
      expect(result).toEqual({
        default: { lodash: "^4.17.21" },
      });
    });

    it("returns undefined if no catalogs in YAML or JSON", () => {
      const content = `nodeLinker: node-modules\n`;
      const result = parseCatalogContent(content, "yarn");
      expect(result).toBeUndefined();
    });

    it("returns undefined for JSON without workspaces catalogs", () => {
      const packageJson = JSON.stringify({
        name: "test",
        workspaces: { packages: ["packages/*"] },
      });
      const result = parseCatalogContent(packageJson, "yarn");
      expect(result).toBeUndefined();
    });
  });
});
