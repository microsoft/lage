// @ts-check
/**
 * Options passed to swc.transformFile
 * @type {import("@swc/core").Options}
 */
const options = {
  jsc: {
    parser: {
      syntax: "typescript",
      tsx: false,
      dynamicImport: true,
    },
    target: "es2020",
  },
  module: {
    type: "commonjs",
    ignoreDynamic: true,
  },
};
module.exports = options;
