const fs = require("fs");

// @ts-check
/** @type {import('beachball').BeachballConfig}*/
const config = {
  access: "public",
  groupChanges: true,
  branch: "main",
  changelog: {
    groups: [
      {
        // roll up all changes to the lage changelog (packages still have individual changelogs too)
        mainPackageName: "lage",
        include: ["packages/*"],
        // these are not dependencies of lage
        exclude: ["!packages/backfill", "!packages/cache-github-actions", "!packages/grapher"],
        changelogPath: "packages/lage",
      },
      {
        mainPackageName: "backfill",
        changelogPath: "packages/backfill",
        include: ["packages/backfill", "packages/backfill-*"],
      },
    ],
  },
  hooks: {
    prepublish: (packagePath, name, version, packageInfos) => {
      const { packageJsonPath } = packageInfos[name];
      const packageJson = require(packageJsonPath);
      if (!packageJson.dependencies) return;

      for (const [dep, version] of Object.entries(packageJson.dependencies)) {
        // If the dep is a specific version, unpin before publishing.
        // See the comment towards the end of renovate.json5 for why the deps are pinned to start out.
        if (/\d/.test(version[0])) {
          packageJson.dependencies[dep] = `^${version}`;
        }
      }
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
    },
  },
  ignorePatterns: [".*ignore", "jest.config.js", "**/__*/**/*"],
  disallowedChangeTypes: ["major"],
};
module.exports = config;
