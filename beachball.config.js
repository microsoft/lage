// @ts-check
/** @type {import('beachball').BeachballConfig}*/
module.exports = {
  groupChanges: true,
  access: "public",
  ignorePatterns: [
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
};
