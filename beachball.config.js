// @ts-check
/** @type {import('beachball').BeachballConfig}*/
const config = {
  access: "public",
  groupChanges: true,
  changelog: {
    groups: [
      {
        // roll up all changes to the lage changelog (packages still have individual changelogs too)
        masterPackageName: "lage",
        include: ["packages/*"],
        changelogPath: "packages/lage",
      },
    ],
  },
  ignorePatterns: [".*ignore", "jest.config.js", "**/__*/**/*", "**/tests/**/*"],
};
module.exports = config;
