// @ts-check

// https://jamiemason.github.io/syncpack/
/** @type {import('syncpack').RcFile} */
const config = {
  customTypes: {
    optional: { path: "optionalDependencies", strategy: "versionsByName" },
  },
  dependencyTypes: ["dev", "prod", "optional", "local"],
  versionGroups: [
    {
      label: "native optional deps use workspace protocol",
      dependencies: ["glob-hasher-*"],
      dependencyTypes: ["optional"],
      pinVersion: "workspace:*",
    },
    {
      label: "native package versions match glob-hasher",
      dependencies: ["glob-hasher-*"],
      dependencyTypes: ["local"],
      pinVersion: require("./packages/glob-hasher/package.json").version,
    },
    {
      label: "internal deps use workspace protocol",
      dependencies: ["@lage-run/**", "backfill", "backfill-*", "glob-hasher", "glob-hasher-*"],
      packages: ["**"],
      specifierTypes: ["workspace-protocol"],
    },
    {
      label: "ignore other package versions",
      dependencyTypes: ["local"],
      isIgnored: true,
    },
  ],
  semverGroups: [
    {
      // lage bundles its dependencies, so any updates should to dependencies should be explicit
      // so that they trigger a new lage version (with proper documentation of included updates).
      // The standard approach of using ^ dependencies and allowing implicit updates via the lock file
      // (which with a published bundle, are guaranteed to affect consumers) makes it very hard to
      // track when an issue was introduced if it's discovered in another repo, so we pin deps locally.
      // But since pinned deps are not great for anyone consuming the sub-packages directly, the
      // beachball config includes a prepublish hook to unpin them.
      label: "pin dependencies",
      range: "",
      dependencyTypes: ["prod"],
      packages: ["!@lage-run/docs", "!@lage-run/monorepo-scripts", "!@lage-run/test-utilities", "!backfill-utils-test"],
    },
  ],
};
module.exports = config;
