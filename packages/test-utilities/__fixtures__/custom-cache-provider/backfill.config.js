const fs = require("fs");
const path = require("path");

module.exports = {
  cacheStorageConfig: {
    provider: (logger, cwd) => ({
      fetch(hash) {
        fs.writeFileSync(path.join(cwd, "fetch.txt"), hash);
        return Promise.resolve(true);
      },
      put(hash, filesToCache) {
        fs.writeFileSync(
          path.join(cwd, "put.txt"),
          `${hash},${filesToCache.length}`
        );
        return Promise.resolve();
      },
    }),
    name: "custom-provider",
  },
};
