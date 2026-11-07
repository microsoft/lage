const { createConfig } = require("./config/eslintConfig");

module.exports = createConfig({
  dirname: __dirname,
  ignoreRootJsFiles: false,
});
