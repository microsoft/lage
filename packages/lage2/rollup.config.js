import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";

export default {
  input: "@lage-run/cli/lib/cli.js",
  output: {
    banner: "#!/usr/bin/env node",
    sourcemap: "inline",
    file: "dist/lage.js",
    format: "cjs",
    exports: "auto",
    sourcemap: true
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs({
      ignoreDynamicRequires: true,
    }),
    json(),
    terser(),
  ],
};
