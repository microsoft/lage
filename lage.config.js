// @ts-check
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: ["build"],
  },
  npmClient: "yarn",
  cacheOptions: {
    // These are relative to the git root, and affect the hash of the cache.
    // Changes to any of these files will invalidate the cache.
    environmentGlob: [
      // Folder globs MUST end with **/* to include all files!
      "!node_modules/**/*",
      "!**/node_modules/**/*",
      ".github/workflows/*",
      "beachball.config.js",
      "lage.config.js",
      "package.json",
      "patches/**/*",
      "scripts/**/*",
      "yarn.lock",
    ],
    // Subset of files in package directories that will be saved into the cache.
    outputGlob: ["lib/**/*"],
  },
};
