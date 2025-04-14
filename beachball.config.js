// @ts-check
/** @type {import('beachball').BeachballConfig}*/
const config = {
  groupChanges: true,
  access: "public",
  ignorePatterns: [
    "benchmark/**",
    ".*ignore",
    ".github/**",
    "beachball.config.js",
    "decks/**",
    "docs/**",
    "jasmine.json",
    "packages/*/jest.config.js",
    "packages/*/tests/**",
    // This one is especially important (otherwise dependabot would be blocked by change file requirements)
    "yarn.lock",
  ],
  hooks: {
    prepublish: (packagePath, name, version, packageInfos) => {
      const { packageJsonPath } = packageInfos[name];
      const packageJson = require(packageJsonPath);
      for (const [dep, version] of Object.entries(packageJson.dependencies || {})) {
        // If the dep is a specific version, unpin before publishing.
        // See the comment towards the end of renovate.json5 for why the deps are pinned to start out.
        if (/^\d/.test(version)) {
          packageJson.dependencies[dep] = `^${version}`;
        }
      }
    },
  },
};

module.exports = config;
