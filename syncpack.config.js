// @ts-check

// https://jamiemason.github.io/syncpack/
/** @type {import('syncpack').RcFile} */
const config = {
  dependencyTypes: ["dev", "prod"],
  versionGroups: [
    {
      label: "lage deps use workspace protocol",
      dependencies: ["@lage-run/**"],
      packages: ["**"],
      specifierTypes: ["workspace-protocol"],
    },
  ],
  semverGroups: [
    {
      // See below for explanation (this must come first in order)
      label: "non-pinned dependencies",
      range: "^",
      dependencyTypes: ["prod"],
      // glob-hasher is a runtime dependency of lage since it publishes binaries.
      dependencies: ["glob-hasher"],
    },
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
      packages: ["!@lage-run/docs", "!@lage-run/monorepo-scripts"],
    },
  ],
};
module.exports = config;
