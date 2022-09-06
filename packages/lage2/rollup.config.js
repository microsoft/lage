import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";
import alias from "@rollup/plugin-alias";

export default [{
  input: "@lage-run/cli/lib/cli.js",
  output: {
    banner: "#!/usr/bin/env node",
    sourcemap: "inline",
    file: "dist/lage.js",
    format: "cjs",
    exports: "auto",
    sourcemap: true,
  },
  plugins: [
    alias({
      // Added this entry to guard against readable-stream's WEIRD import of "string_decoder/" (present in v3.x)
      entries: [{ find: "string_decoder/", replacement: "string_decoder" }],
    }),
    nodeResolve({
      // Since we are produce CJS, let's resolve main first!
      mainFields: ["main", "module"],
      preferBuiltins: true,
    }),
    commonjs({
      ignoreDynamicRequires: true,
    }),
    json(),
    terser(),
  ],
}, {
  input: "./index.js",
  output: {
    file: "dist/main.js",
    format: "cjs",
    exports: "auto",
    sourcemap: true,
  },
  plugins: [
    nodeResolve({
      // Since we are produce CJS, let's resolve main first!
      mainFields: ["main", "module"],
      preferBuiltins: true,
    }),
    commonjs({
      ignoreDynamicRequires: true,
    }),
    json(),
    terser(),
  ]
}];
