const cache = require("@actions/cache");
const path = require("path");
const { getWorkspaceRoot } = require("workspace-tools");

const root = getWorkspaceRoot(process.cwd());

const cacheProvider = {
  provider: (_logger, cwd) => {
    return {
      async fetch(hash) {
        if (!hash) {
          return false;
        }

        const paths = [path.relative(root, path.join(cwd, "**"))];
        const restoreKeys = ["lage-"];

        try {
          const cacheKey = await cache.restoreCache(paths, hash, restoreKeys);
          console.log(cwd, cacheKey);
        } catch (e) {
          console.error(e);
        }

        return !!cacheKey;
      },

      async put(hash, filesToCache) {
        if (!hash) {
          return;
        }

        const paths = filesToCache.map((files) => path.relative(root, path.join(cwd, files)));

        await cache.saveCache(paths, hash);
      },
    };
  },
  name: "github-actions",
};

module.exports = cacheProvider;
