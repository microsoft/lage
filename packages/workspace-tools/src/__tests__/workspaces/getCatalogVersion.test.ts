import { describe, expect, it } from "@jest/globals";
import type { Catalogs } from "../../types/Catalogs.js";
import { getCatalogVersion } from "../../workspaces/getCatalogVersion.js";

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

describe("getCatalogVersion", () => {
  it("returns undefined for non-catalog versions", () => {
    const result = getCatalogVersion({ name: "react", version: "1.2.3", catalogs: defaultCatalogs });
    expect(result).toBeUndefined();
  });

  it("returns version from default catalog", () => {
    const result = getCatalogVersion({ name: "react", version: "catalog:", catalogs: defaultCatalogs });
    expect(result).toBe("^18.2.0");
  });

  it("returns version from named catalog", () => {
    const result17 = getCatalogVersion({ name: "react", version: "catalog:react17", catalogs: namedCatalogs });
    expect(result17).toBe("^17.0.2");
    const result18 = getCatalogVersion({ name: "react", version: "catalog:react18", catalogs: namedCatalogs });
    expect(result18).toBe("^18.2.0");
  });

  it("throws if catalog version used but no catalogs defined", () => {
    expect(() => getCatalogVersion({ name: "react", version: "catalog:", catalogs: undefined })).toThrow(
      'Dependency "react" uses a catalog version "catalog:" but no catalogs are defined.'
    );
  });

  it("throws if default catalog version used but no default catalog defined", () => {
    expect(() =>
      getCatalogVersion({ name: "react", version: "catalog:", catalogs: { named: namedCatalogs.named } })
    ).toThrow('Dependency "react" uses a catalog version "catalog:" but the default catalog is not defined.');
  });

  it("throws if named catalog version used but no named catalogs defined", () => {
    expect(() => getCatalogVersion({ name: "react", version: "catalog:react17", catalogs: defaultCatalogs })).toThrow(
      'Dependency "react" uses a catalog version "catalog:react17" but catalogs.react17 is not defined.'
    );
  });

  it("throws if catalog name is invalid", () => {
    expect(() => getCatalogVersion({ name: "react", version: "catalog:nope", catalogs: namedCatalogs })).toThrow(
      'Dependency "react" uses a catalog version "catalog:nope" but catalogs.nope is not defined.'
    );
  });

  it("throws if package not found in catalog", () => {
    expect(() => getCatalogVersion({ name: "vue", version: "catalog:", catalogs: defaultCatalogs })).toThrow(
      'Dependency "vue" uses a catalog version "catalog:", but the default catalog doesn\'t define a version for "vue".'
    );
  });

  it("throws on recursive catalog version", () => {
    const catalogs: Catalogs = {
      named: {
        react18: { react: "^18.0.0" },
        bad: { react: "catalog:react18" },
      },
    };
    expect(() => getCatalogVersion({ name: "react", version: "catalog:bad", catalogs })).toThrow(
      'Dependency "react" resolves to a recursive catalog version "catalog:react18", which is not supported.'
    );
  });

  describe("with allowNotFound: true", () => {
    const allowNotFound = true;

    it("returns undefined if no catalogs defined", () => {
      const result = getCatalogVersion({ name: "react", version: "catalog:", catalogs: undefined, allowNotFound });
      expect(result).toBeUndefined();
    });

    it("returns undefined if package not found in catalog", () => {
      const result = getCatalogVersion({ name: "vue", version: "catalog:", catalogs: defaultCatalogs, allowNotFound });
      expect(result).toBeUndefined();
    });

    it("returns undefined if default catalog version used but no default catalog defined", () => {
      const result = getCatalogVersion({
        name: "react",
        version: "catalog:",
        catalogs: { named: namedCatalogs.named },
        allowNotFound,
      });
      expect(result).toBeUndefined();
    });

    it("returns undefined if named catalog version used but no named catalogs defined", () => {
      const result = getCatalogVersion({
        name: "react",
        version: "catalog:react17",
        catalogs: defaultCatalogs,
        allowNotFound,
      });
      expect(result).toBeUndefined();
    });
  });

  it("returns workspace: catalog version", () => {
    // This is not supported by pnpm as of writing, but it would have already errored on install
    const catalogs: Catalogs = {
      default: {
        foo: "workspace:^",
      },
    };
    const result = getCatalogVersion({ name: "foo", version: "catalog:", catalogs });
    expect(result).toBe("workspace:^");
  });

  // This is the case for pnpm (see comment in file)
  it('uses the default catalog for "catalog:default" if no catalog named "default" is present', () => {
    const result = getCatalogVersion({ name: "lodash", version: "catalog:default", catalogs: defaultCatalogs });
    expect(result).toBe("^4.17.21");
  });

  // This is only relevant for yarn (see comment in file)
  it('uses the catalog named "default" for "catalog:default" if present', () => {
    const catalogs: Catalogs = {
      default: { react: "^18.2.0" },
      named: { default: { react: "^17.0.2" } },
    };
    const result = getCatalogVersion({ name: "react", version: "catalog:default", catalogs });
    expect(result).toBe("^17.0.2");
  });

  // This is only relevant for yarn (see comment in file)
  it('uses the default catalog for "catalog:" even if a catalog named "default" is present', () => {
    const catalogs: Catalogs = {
      default: { react: "^18.2.0" },
      named: { default: { react: "^17.0.2" } },
    };
    const result = getCatalogVersion({ name: "react", version: "catalog:", catalogs });
    expect(result).toBe("^18.2.0");
  });
});
