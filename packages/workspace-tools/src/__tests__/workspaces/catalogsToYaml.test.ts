import { describe, expect, it } from "@jest/globals";
import { catalogsToYaml } from "../../workspaces/catalogsToYaml.js";
import type { Catalogs } from "../../types/Catalogs.js";
import dedent from "ts-dedent";

describe("catalogsToYaml", () => {
  it("returns empty string for empty catalogs", () => {
    const catalogs: Catalogs = {};

    const result = catalogsToYaml(catalogs);
    expect(result).toBe("");
  });

  it("converts default catalog to yaml format", () => {
    const catalogs: Catalogs = {
      default: {
        react: "^18.0.0",
        typescript: "~5.0.0",
      },
    };

    const result = catalogsToYaml(catalogs);
    expect(result).toEqual(dedent`
      catalog:
        react: ^18.0.0
        typescript: ~5.0.0`);
  });

  it("converts named catalogs to yaml format", () => {
    const catalogs: Catalogs = {
      named: {
        react18: {
          react: "^18.0.0",
          "react-dom": "^18.0.0",
        },
        react17: {
          react: "^17.0.0",
          "react-dom": "^17.0.0",
        },
      },
    };

    const result = catalogsToYaml(catalogs);
    expect(result).toEqual(dedent`
      catalogs:
        react18:
          react: ^18.0.0
          react-dom: ^18.0.0
        react17:
          react: ^17.0.0
          react-dom: ^17.0.0`);
  });

  it("converts both default and named catalogs", () => {
    const catalogs: Catalogs = {
      default: {
        typescript: "~5.0.0",
      },
      named: {
        testing: {
          jest: "^29.0.0",
        },
      },
    };

    const result = catalogsToYaml(catalogs);
    expect(result).toEqual(dedent`
      catalog:
        typescript: ~5.0.0
      catalogs:
        testing:
          jest: ^29.0.0`);
  });

  it("respects indent with tab", () => {
    const catalogs: Catalogs = {
      named: { test: { pkg: "1.0.0" } },
    };

    const result = catalogsToYaml(catalogs, { indent: "\t" });
    expect(result).toEqual(dedent`
      catalogs:
      	test:
      		pkg: 1.0.0`);
  });

  it("respects indent with 4 spaces", () => {
    const catalogs: Catalogs = {
      named: { test: { pkg: "1.0.0" } },
    };

    const result = catalogsToYaml(catalogs, { indent: 4 });
    expect(result).toEqual(dedent`
      catalogs:
          test:
              pkg: 1.0.0`);
  });
});
