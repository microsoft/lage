import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";

export default {
  input: "@lage-run/cli/lib/cli.js",
  output: {
    file: "dist/lage.js",
    format: "cjs",
  },
  plugins: [
    nodeResolve(),
    commonjs({
      ignoreDynamicRequires: true,
    }),
    json(),
    terser(),
  ],
  sourcemap: "inline",
};
